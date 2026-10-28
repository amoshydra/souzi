package com.amoshydra.souzi;

import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;
import java.util.zip.GZIPInputStream;
import org.json.JSONObject;

/**
 * Reads the optional prebuilt ECDICT SQLite pack.
 *
 * This plugin is deliberately read-only. The full dictionary is a versioned
 * data pack; user favorites and history remain in IndexedDB.
 */
@CapacitorPlugin(name = "FullEnglishDictionary")
public class FullEnglishDictionaryPlugin extends Plugin {

    private static final String META_FILE = "meta.json";
    private static final String DB_FILE = "full.sqlite";
    private static final int SCHEMA_VERSION = 1;
    private static final int MAX_PREFIX_RESULTS = 80;

    private SQLiteDatabase database;

    private File rootDir() {
        File dir = new File(getContext().getFilesDir(), "ecdict");
        if (!dir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        }
        return dir;
    }

    private File databaseFile() {
        return new File(rootDir(), DB_FILE);
    }

    private File metadataFile() {
        return new File(rootDir(), META_FILE);
    }

    private synchronized JSONObject readMetadata() {
        File file = metadataFile();
        if (!file.isFile()) return null;
        try (InputStream input = new FileInputStream(file)) {
            byte[] bytes = new byte[(int) file.length()];
            int offset = 0;
            while (offset < bytes.length) {
                int read = input.read(bytes, offset, bytes.length - offset);
                if (read == -1) break;
                offset += read;
            }
            return new JSONObject(new String(bytes, 0, offset, StandardCharsets.UTF_8));
        } catch (Exception ignored) {
            return null;
        }
    }

    private synchronized void closeDatabase() {
        if (database != null) {
            try {
                database.close();
            } catch (Exception ignored) {
                // Best effort.
            }
            database = null;
        }
    }

    private synchronized SQLiteDatabase openDatabase() {
        if (database == null) {
            database = SQLiteDatabase.openDatabase(
                databaseFile().getAbsolutePath(),
                null,
                SQLiteDatabase.OPEN_READONLY | SQLiteDatabase.NO_LOCALIZED_COLLATORS
            );
        }
        return database;
    }

    private void resolveOnUiThread(PluginCall call, JSObject result) {
        if (getActivity() == null) {
            call.resolve(result);
            return;
        }
        getActivity().runOnUiThread(() -> call.resolve(result));
    }

    private void rejectOnUiThread(PluginCall call, String message) {
        if (getActivity() == null) {
            call.reject(message);
            return;
        }
        getActivity().runOnUiThread(() -> call.reject(message));
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        synchronized (this) {
            JSONObject meta = readMetadata();
            boolean installed = meta != null && databaseFile().isFile();
            result.put("installed", installed);
            if (installed) {
                result.put("meta", meta);
            }
        }
        call.resolve(result);
    }

    @PluginMethod
    public void remove(PluginCall call) {
        synchronized (this) {
            closeDatabase();
            //noinspection ResultOfMethodCallIgnored
            databaseFile().delete();
            //noinspection ResultOfMethodCallIgnored
            metadataFile().delete();
        }
        call.resolve();
    }

    @PluginMethod
    public void install(PluginCall call) {
        String sourcePath = call.getString("sourcePath");
        String expectedSha256 = call.getString("sha256", "");
        boolean deleteSource = Boolean.TRUE.equals(call.getBoolean("deleteSource", false));

        if (sourcePath == null || sourcePath.isEmpty()) {
            call.reject("A downloaded dictionary file is required.");
            return;
        }

        new Thread(
            () -> {
                File source;
                File temporary = new File(rootDir(), "full.sqlite.tmp");
                try {
                    source = sourcePath.startsWith("file:")
                        ? new File(Uri.parse(sourcePath).getPath())
                        : new File(sourcePath);

                    if (!source.isFile()) {
                        throw new IOException("The downloaded dictionary is missing.");
                    }

                    if (expectedSha256 != null && !expectedSha256.isEmpty()) {
                        String actual = sha256(source);
                        if (!actual.equalsIgnoreCase(expectedSha256)) {
                            throw new IOException("The dictionary checksum does not match.");
                        }
                    }

                    synchronized (FullEnglishDictionaryPlugin.this) {
                        closeDatabase();
                        //noinspection ResultOfMethodCallIgnored
                        temporary.delete();

                        try (
                            InputStream input = new GZIPInputStream(
                                new BufferedInputStream(new FileInputStream(source))
                            );
                            OutputStream output = new BufferedOutputStream(
                                new FileOutputStream(temporary)
                            )
                        ) {
                            byte[] buffer = new byte[64 * 1024];
                            int read;
                            while ((read = input.read(buffer)) != -1) {
                                output.write(buffer, 0, read);
                            }
                        }

                        JSONObject meta = inspectDatabase(temporary);
                        File target = databaseFile();
                        //noinspection ResultOfMethodCallIgnored
                        target.delete();
                        if (!temporary.renameTo(target)) {
                            copyFile(temporary, target);
                            //noinspection ResultOfMethodCallIgnored
                            temporary.delete();
                        }

                        meta.put("installedAt", now());
                        meta.put("size", target.length());
                        writeMetadata(meta);
                        if (deleteSource) {
                            //noinspection ResultOfMethodCallIgnored
                            source.delete();
                        }
                    }

                    JSObject result = new JSObject();
                    result.put("installed", true);
                    result.put("meta", readMetadata());
                    resolveOnUiThread(call, result);
                } catch (Exception error) {
                    //noinspection ResultOfMethodCallIgnored
                    temporary.delete();
                    rejectOnUiThread(
                        call,
                        error.getMessage() == null ? "The dictionary could not be installed." : error.getMessage()
                    );
                }
            },
            "souzi-ecdict-install"
        ).start();
    }

    private JSONObject inspectDatabase(File file) throws Exception {
        if (!file.isFile()) {
            throw new IOException("The dictionary database was not written.");
        }

        SQLiteDatabase temp = SQLiteDatabase.openDatabase(
            file.getAbsolutePath(),
            null,
            SQLiteDatabase.OPEN_READONLY | SQLiteDatabase.NO_LOCALIZED_COLLATORS
        );

        try (Cursor cursor = temp.rawQuery(
            "SELECT key, value FROM meta",
            null
        )) {
            JSONObject meta = new JSONObject();
            while (cursor.moveToNext()) {
                meta.put(cursor.getString(0), cursor.getString(1));
            }

            if (meta.optInt("schema_version", -1) != SCHEMA_VERSION) {
                throw new IOException("This dictionary version is not supported by this app.");
            }
            if (meta.optInt("entry_count", 0) <= 0) {
                throw new IOException("The dictionary is empty.");
            }

            int count = meta.optInt("entry_count", 0);
            meta.put("count", count);
            meta.put("version", meta.optString("data_version", "1"));
            meta.put("schema", meta.optInt("schema_version", SCHEMA_VERSION));
            return meta;
        } finally {
            temp.close();
        }
    }

    private void writeMetadata(JSONObject meta) throws IOException {
        try (OutputStream output = new FileOutputStream(metadataFile())) {
            output.write(meta.toString().getBytes(StandardCharsets.UTF_8));
        }
    }

    private String now() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    private String sha256(File file) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
        }
        StringBuilder result = new StringBuilder();
        for (byte value : digest.digest()) {
            result.append(String.format("%02x", value));
        }
        return result.toString();
    }

    private void copyFile(File source, File target) throws IOException {
        try (
            InputStream input = new BufferedInputStream(new FileInputStream(source));
            OutputStream output = new BufferedOutputStream(new FileOutputStream(target))
        ) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
        }
    }

    private List<String> strings(JSArray array) {
        List<String> values = new ArrayList<>();
        if (array == null) return values;
        for (int index = 0; index < array.length(); index += 1) {
            String value = array.optString(index, "");
            if (!value.isEmpty()) values.add(value);
        }
        return values;
    }

    private String placeholders(int count) {
        StringBuilder result = new StringBuilder();
        for (int index = 0; index < count; index += 1) {
            if (index > 0) result.append(',');
            result.append('?');
        }
        return result.toString();
    }

    @PluginMethod
    public synchronized void lookupWords(PluginCall call) {
        List<String> keys = strings(call.getArray("keys"));
        if (keys.isEmpty()) {
            call.resolve(new JSObject().put("matches", new JSArray()));
            return;
        }

        try {
            SQLiteDatabase db = openDatabase();
            String sql =
                "SELECT id, word_key, priority FROM entries WHERE word_key IN (" +
                placeholders(keys.size()) +
                ") ORDER BY priority ASC, word_key ASC LIMIT 500";
            JSArray matches = new JSArray();
            try (Cursor cursor = db.rawQuery(sql, keys.toArray(new String[0]))) {
                while (cursor.moveToNext()) {
                    JSObject match = new JSObject();
                    match.put("id", cursor.getLong(0));
                    match.put("key", cursor.getString(1));
                    match.put("priority", cursor.getLong(2));
                    matches.put(match);
                }
            }
            call.resolve(new JSObject().put("matches", matches));
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }

    @PluginMethod
    public synchronized void lookupForms(PluginCall call) {
        List<String> keys = strings(call.getArray("keys"));
        if (keys.isEmpty()) {
            call.resolve(new JSObject().put("matches", new JSArray()));
            return;
        }

        try {
            SQLiteDatabase db = openDatabase();
            String sql =
                "SELECT form, entry_id FROM forms WHERE form IN (" +
                placeholders(keys.size()) +
                ") ORDER BY entry_id ASC LIMIT 500";
            JSArray matches = new JSArray();
            try (Cursor cursor = db.rawQuery(sql, keys.toArray(new String[0]))) {
                while (cursor.moveToNext()) {
                    JSObject match = new JSObject();
                    match.put("key", cursor.getString(0));
                    match.put("id", cursor.getLong(1));
                    matches.put(match);
                }
            }
            call.resolve(new JSObject().put("matches", matches));
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }

    @PluginMethod
    public synchronized void prefix(PluginCall call) {
        String query = call.getString("query", "").trim().toLowerCase(Locale.ROOT);
        int limit = Math.max(1, Math.min(call.getInt("limit", MAX_PREFIX_RESULTS), MAX_PREFIX_RESULTS));
        if (query.isEmpty()) {
            call.resolve(new JSObject().put("ids", new JSArray()));
            return;
        }

        try {
            SQLiteDatabase db = openDatabase();
            JSArray ids = new JSArray();
            String upper = query + "\uffff";
            try (
                Cursor cursor = db.rawQuery(
                    "SELECT id FROM entries WHERE word_key >= ? AND word_key < ? ORDER BY priority ASC, word_key ASC LIMIT ?",
                    new String[] { query, upper, String.valueOf(limit) }
                )
            ) {
                while (cursor.moveToNext()) {
                    ids.put(cursor.getLong(0));
                }
            }
            call.resolve(new JSObject().put("ids", ids));
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }

    @PluginMethod
    public synchronized void entries(PluginCall call) {
        List<String> rawIds = strings(call.getArray("ids"));
        List<Long> ids = new ArrayList<>();
        for (String rawId : rawIds) {
            try {
                ids.add(Long.parseLong(rawId));
            } catch (NumberFormatException ignored) {
                // Ignore malformed IDs.
            }
        }
        if (ids.isEmpty()) {
            call.resolve(new JSObject().put("entries", new JSArray()));
            return;
        }

        try {
            SQLiteDatabase db = openDatabase();
            String sql =
                "SELECT id, word, phonetic, translation, definition, pos, tags, collins, oxford, bnc, frq, exchange " +
                "FROM entries WHERE id IN (" +
                placeholders(ids.size()) +
                ") LIMIT 100";
            JSArray entries = new JSArray();
            String[] arguments = new String[ids.size()];
            for (int index = 0; index < ids.size(); index += 1) {
                arguments[index] = String.valueOf(ids.get(index));
            }
            try (Cursor cursor = db.rawQuery(sql, arguments)) {
                while (cursor.moveToNext()) {
                    JSObject entry = new JSObject();
                    entry.put("id", cursor.getLong(0));
                    entry.put("word", cursor.getString(1));
                    entry.put("phonetic", cursor.getString(2));
                    entry.put("translation", cursor.getString(3));
                    entry.put("definition", cursor.getString(4));
                    entry.put("pos", cursor.getString(5));
                    entry.put("tags", cursor.getString(6));
                    entry.put("collins", cursor.getInt(7));
                    entry.put("oxford", cursor.getInt(8));
                    entry.put("bnc", cursor.getInt(9));
                    entry.put("frq", cursor.getInt(10));
                    entry.put("exchange", cursor.getString(11));
                    entries.put(entry);
                }
            }
            call.resolve(new JSObject().put("entries", entries));
        } catch (Exception error) {
            call.reject(error.getMessage(), error);
        }
    }
}
