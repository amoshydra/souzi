package com.amoshydra.souzi;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Speaks a word through the system text-to-speech engine.
 *
 * The Android WebView does not expose the Web Speech Synthesis API, so the
 * web layer delegates "Listen to this word" here.
 */
@CapacitorPlugin(name = "SouziSpeech")
public class SpeechPlugin extends Plugin {

    private TextToSpeech tts;
    private final AtomicBoolean ready = new AtomicBoolean(false);
    private final AtomicBoolean failed = new AtomicBoolean(false);
    private PluginCall pendingSpeak;
    private final Map<String, PluginCall> speechListeners = new HashMap<>();

    private void ensureEngine() {
        if (ready.get() || failed.get() || tts != null) {
            return;
        }
        tts =
            new TextToSpeech(
                getContext(),
                status -> {
                    if (status == TextToSpeech.SUCCESS) {
                        // Preload both languages so the first speak avoids the
                        // per-voice warm-up delay.
                        tts.setLanguage(new Locale("zh", "CN"));
                        tts.setLanguage(Locale.US);
                        ready.set(true);
                        PluginCall call = pendingSpeak;
                        pendingSpeak = null;
                        if (call != null) {
                            runSpeak(call);
                        }
                    } else {
                        failed.set(true);
                        PluginCall call = pendingSpeak;
                        pendingSpeak = null;
                        if (call != null) {
                            call.reject("Speech engine is not available");
                        }
                    }
                }
            );
        tts.setOnUtteranceProgressListener(
            new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {}

                @Override
                public void onDone(String utteranceId) {
                    notifySpeakDone(utteranceId, null);
                }

                @Override
                public void onError(String utteranceId) {
                    notifySpeakDone(utteranceId, "tts_failed");
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    notifySpeakDone(utteranceId, "tts_error_" + errorCode);
                }
            }
        );
    }

    @PluginMethod
    public void status(PluginCall call) {
        ensureEngine();
        JSObject result = new JSObject();
        result.put("ready", ready.get());
        result.put("failed", failed.get());
        call.resolve(result);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        if (ready.get()) {
            runSpeak(call);
        } else if (failed.get()) {
            call.reject("Speech engine is not available");
        } else {
            ensureEngine();
            // Engine still warming up; run once it is ready.
            pendingSpeak = call;
        }
    }

    private void runSpeak(PluginCall call) {
        String text = call.getString("text");
        String lang = call.getString("lang", "en-US");
        if (text == null || text.trim().isEmpty()) {
            call.reject("Nothing to speak");
            return;
        }

        Locale locale = "en-US".equalsIgnoreCase(lang)
            ? Locale.US
            : new Locale("zh", "CN");
        tts.setLanguage(locale);
        tts.setSpeechRate("en-US".equalsIgnoreCase(lang) ? 0.9f : 0.85f);

        String utteranceId = "souzi-" + System.currentTimeMillis();
        speechListeners.put(utteranceId, call);

        int result = tts.speak(
            text.trim(),
            TextToSpeech.QUEUE_FLUSH,
            null,
            utteranceId
        );
        if (result == TextToSpeech.ERROR) {
            speechListeners.remove(utteranceId);
            call.reject("Could not start speech");
        }
        // Otherwise keep the call pending until onDone/onError resolves it.
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            tts.stop();
        }
        call.resolve();
    }

    private void notifySpeakDone(String utteranceId, String error) {
        PluginCall call = speechListeners.remove(utteranceId);
        if (call == null) {
            return;
        }
        if (error == null) {
            call.resolve(new JSObject());
        } else {
            call.reject("Speech failed: " + error);
        }
    }
}
