package com.amoshydra.souzi;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@CapacitorPlugin(name = "DictionaryDownloader")
public class DictionaryDownloaderPlugin extends Plugin {

    private static final Map<Long, DownloadTask> TASKS = new ConcurrentHashMap<>();
    private static final AtomicLong NEXT_ID = new AtomicLong(System.currentTimeMillis());

    private File downloadDir() {
        File dir = new File(getContext().getFilesDir(), "dictionary-downloads");
        if (!dir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        }
        return dir;
    }

    private boolean isWifiConnected() {
        ConnectivityManager manager = (ConnectivityManager) getContext()
            .getSystemService(Context.CONNECTIVITY_SERVICE);
        if (manager == null) return false;
        Network network = manager.getActiveNetwork();
        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        return (
            capabilities != null &&
            capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) &&
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        );
    }

    @PluginMethod
    public void enqueue(PluginCall call) {
        String url = call.getString("url");
        String requestedName = call.getString("fileName", "dictionary.bin");
        Boolean wifiOnlyValue = call.getBoolean("wifiOnly", true);
        boolean wifiOnly = Boolean.TRUE.equals(wifiOnlyValue);

        if (url == null || url.isEmpty()) {
            call.reject("A download URL is required.");
            return;
        }

        String fileName = new File(requestedName).getName().replaceAll(
            "[^A-Za-z0-9._-]",
            "_"
        );
        long id = NEXT_ID.incrementAndGet();
        DownloadTask task = new DownloadTask(id, url, fileName, wifiOnly);
        TASKS.put(id, task);
        task.start();

        JSObject result = new JSObject();
        result.put("id", id);
        call.resolve(result);
    }

    @PluginMethod
    public void status(PluginCall call) {
        DownloadTask task = taskFor(call);
        if (task == null) return;

        JSObject result = new JSObject();
        result.put("id", task.id);
        result.put("status", task.status);
        result.put("bytesDownloaded", task.bytesDownloaded);
        result.put("totalBytes", task.totalBytes);
        result.put("reason", task.error.isEmpty() ? 0 : 1);
        result.put("localUri", "file://" + task.file.getAbsolutePath());
        call.resolve(result);
    }

    @PluginMethod
    public void pause(PluginCall call) {
        DownloadTask task = taskFor(call);
        if (task == null) return;
        task.pause();
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        DownloadTask task = taskFor(call);
        if (task == null) return;
        task.resume();
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        DownloadTask task = taskFor(call);
        if (task == null) return;
        task.cancel();
        TASKS.remove(task.id);
        call.resolve();
    }

    @PluginMethod
    public void readFile(PluginCall call) {
        DownloadTask task = taskFor(call);
        if (task == null) return;

        if (!"successful".equals(task.status)) {
            call.reject("The download is not complete.");
            return;
        }

        try {
            byte[] bytes = readAllBytes(task.file);
            JSObject result = new JSObject();
            result.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
            result.put("fileName", task.file.getName());
            result.put("size", bytes.length);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }

    private DownloadTask taskFor(PluginCall call) {
        Long id = call.getLong("id");
        if (id == null) {
            call.reject("A download id is required.");
            return null;
        }
        DownloadTask task = TASKS.get(id);
        if (task == null) {
            call.reject("Download not found. Start a new download.");
            return null;
        }
        return task;
    }

    private static byte[] readAllBytes(File file) throws IOException {
        try (FileInputStream input = new FileInputStream(file)) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            return output.toByteArray();
        }
    }

    private class DownloadTask implements Runnable {

        final long id;
        final String url;
        final String fileName;
        final boolean wifiOnly;
        final File file;

        volatile String status = "pending";
        volatile long bytesDownloaded = 0;
        volatile long totalBytes = -1;
        volatile String error = "";
        volatile boolean paused = false;
        volatile boolean canceled = false;

        private Thread thread;
        private HttpURLConnection connection;

        DownloadTask(long id, String url, String fileName, boolean wifiOnly) {
            this.id = id;
            this.url = url;
            this.fileName = fileName;
            this.wifiOnly = wifiOnly;
            this.file = new File(downloadDir(), fileName);
            this.bytesDownloaded = file.exists() ? file.length() : 0;
        }

        synchronized void start() {
            if (thread != null && thread.isAlive()) return;
            paused = false;
            canceled = false;
            status = "pending";
            thread = new Thread(this, "souzi-dictionary-download");
            thread.start();
        }

        synchronized void pause() {
            if ("successful".equals(status)) return;
            paused = true;
            status = "paused";
            disconnect();
        }

        synchronized void resume() {
            if (paused) {
                paused = false;
                start();
            }
        }

        synchronized void cancel() {
            canceled = true;
            paused = false;
            disconnect();
            //noinspection ResultOfMethodCallIgnored
            file.delete();
            status = "failed";
            error = "Download canceled.";
        }

        private void disconnect() {
            HttpURLConnection active = connection;
            if (active != null) {
                try {
                    active.disconnect();
                } catch (Exception ignored) {
                    // Best effort.
                }
            }
        }

        @Override
        public void run() {
            try {
                while (!canceled) {
                    if (paused) {
                        status = "paused";
                        return;
                    }

                    if (wifiOnly && !isWifiConnected()) {
                        status = "waiting";
                        sleep(1500);
                        continue;
                    }

                    status = "running";
                    downloadOnce();
                    if ("successful".equals(status)) return;
                }
            } catch (Exception error) {
                if (paused) {
                    status = "paused";
                } else if (!canceled) {
                    status = "failed";
                    this.error = error.getMessage() == null
                        ? "Download failed."
                        : error.getMessage();
                }
            } finally {
                connection = null;
            }
        }

        private void downloadOnce() throws IOException {
            long existing = file.exists() ? file.length() : 0;
            HttpURLConnection request = (HttpURLConnection) new URL(url).openConnection();
            connection = request;
            request.setConnectTimeout(20000);
            request.setReadTimeout(30000);
            request.setRequestProperty("User-Agent", "Souzi/1.0 (Android)");
            if (existing > 0) {
                request.setRequestProperty("Range", "bytes=" + existing + "-");
            }

            int responseCode = request.getResponseCode();
            if (responseCode == 416 && existing > 0) {
                bytesDownloaded = existing;
                totalBytes = existing;
                status = "successful";
                return;
            }
            if (responseCode != HttpURLConnection.HTTP_OK && responseCode != 206) {
                throw new IOException("HTTP " + responseCode);
            }

            boolean append = responseCode == 206 && existing > 0;
            if (!append) existing = 0;

            long contentLength = request.getContentLengthLong();
            totalBytes = contentLength >= 0
                ? existing + contentLength
                : -1;
            bytesDownloaded = existing;

            try (
                InputStream input = request.getInputStream();
                FileOutputStream output = new FileOutputStream(file, append)
            ) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    if (canceled) return;
                    if (paused) {
                        status = "paused";
                        return;
                    }
                    if (wifiOnly && !isWifiConnected()) {
                        status = "waiting";
                        disconnect();
                        return;
                    }
                    output.write(buffer, 0, read);
                    bytesDownloaded += read;
                }
            } finally {
                connection = null;
            }

            if (totalBytes > 0 && bytesDownloaded < totalBytes) {
                throw new IOException("The download ended before the full file arrived.");
            }
            if (totalBytes < 0) totalBytes = bytesDownloaded;
            status = "successful";
        }

        private void sleep(long millis) {
            try {
                Thread.sleep(millis);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
        }
    }
}
