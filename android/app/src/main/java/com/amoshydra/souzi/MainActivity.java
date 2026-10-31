package com.amoshydra.souzi;

import android.content.res.Configuration;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DictionaryDownloaderPlugin.class);
        registerPlugin(FullEnglishDictionaryPlugin.class);
        registerPlugin(SpeechPlugin.class);
        super.onCreate(savedInstanceState);
        applyFontScale(getResources().getConfiguration().fontScale);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyFontScale(newConfig.fontScale);
    }

    /**
     * WebView text zoom does not follow the Android font-size setting by
     * default. Apply it on launch and whenever the configuration changes.
     */
    private void applyFontScale(float fontScale) {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge()
            .getWebView()
            .getSettings()
            .setTextZoom(Math.round(fontScale * 100));
    }
}
