package com.iiith.entrance;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean doubleBackToExitPressedOnce = false;

    /**
     * JavaScript Bridge interface exposed to the Web application.
     * Allows TakingInterface (live mock test) to dynamically restrict screenshots on mobile,
     * while keeping screenshots completely enabled across the entire rest of the app.
     */
    public class AndroidSecurityBridge {
        @JavascriptInterface
        public void enableScreenshotRestriction() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }

        @JavascriptInterface
        public void disableScreenshotRestriction() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }
    }

    /**
     * Checks URL and dynamically sets or clears FLAG_SECURE:
     * - Restricts screenshots ONLY when student is inside the live mock test (/attempts/...)
     * - Enables screenshots for the entire rest of the app (dashboard, learning, scorecards, login, etc.)
     */
    public void updateSecurityFlagForUrl(String url) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (url != null && url.contains("/attempts/") && !url.contains("/result") && !url.contains("/review")) {
                    getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            }
        });
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // By default, ALLOW screenshots for the entire app
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);

        // Register bridge to allow mock test to dynamically toggle screenshot restriction
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.addJavascriptInterface(new AndroidSecurityBridge(), "AndroidSecurityBridge");
                }
            }
        });

        // Intercept Android hardware back button & swipe back navigation
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;

                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                    if (webView.getUrl() != null) {
                        updateSecurityFlagForUrl(webView.getUrl());
                    }
                    return;
                }

                // If user is at root page, require double-press within 2 seconds to prevent accidental exit
                if (doubleBackToExitPressedOnce) {
                    moveTaskToBack(true);
                    return;
                }

                doubleBackToExitPressedOnce = true;
                Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();

                new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        doubleBackToExitPressedOnce = false;
                    }
                }, 2000);
            }
        });
    }

    @Override
    public void onBackPressed() {
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            if (webView.getUrl() != null) {
                updateSecurityFlagForUrl(webView.getUrl());
            }
            return;
        }

        if (doubleBackToExitPressedOnce) {
            super.onBackPressed();
            return;
        }

        doubleBackToExitPressedOnce = true;
        Toast.makeText(this, "Press back again to exit", Toast.LENGTH_SHORT).show();

        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                doubleBackToExitPressedOnce = false;
            }
        }, 2000);
    }
}
