package com.amoshydra.souzi;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DictionaryDownloaderPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
