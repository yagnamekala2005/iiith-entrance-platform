package com.iiith.entrance;

import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginHandle;
import com.razorpay.Checkout;
import com.razorpay.PaymentData;
import com.razorpay.PaymentResultWithDataListener;
import org.json.JSONObject;
import ee.forgr.capacitor.social.login.GoogleProvider;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin, PaymentResultWithDataListener {
    private RazorpayNativePlugin activeRazorpayPlugin;
    private boolean doubleBackToExitPressedOnce = false;

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
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode >= GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MIN
                && requestCode < GoogleProvider.REQUEST_AUTHORIZE_GOOGLE_MAX) {
            PluginHandle pluginHandle = getBridge().getPlugin("SocialLogin");

            if (pluginHandle == null) {
                Log.i("Google Activity Result", "SocialLogin login handle is null");
                return;
            }

            Plugin plugin = pluginHandle.getInstance();
            if (!(plugin instanceof SocialLoginPlugin)) {
                Log.i("Google Activity Result", "SocialLogin plugin instance is not SocialLoginPlugin");
                return;
            }

            ((SocialLoginPlugin) plugin).handleGoogleLoginIntent(requestCode, data);
        }
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
    }

    public void openRazorpayCheckout(JSONObject options, RazorpayNativePlugin plugin) throws Exception {
        String keyId = options.optString("key", "");
        if (keyId.isEmpty()) {
            throw new IllegalArgumentException("Razorpay key ID is missing.");
        }

        activeRazorpayPlugin = plugin;
        Checkout.preload(getApplicationContext());
        Checkout checkout = new Checkout();
        checkout.setKeyID(keyId);
        checkout.open(this, options);
    }

    @Override
    public void onPaymentSuccess(String razorpayPaymentId, PaymentData paymentData) {
        if (activeRazorpayPlugin != null) {
            activeRazorpayPlugin.onNativePaymentSuccess(paymentData);
            activeRazorpayPlugin = null;
        }
    }

    @Override
    public void onPaymentError(int code, String response) {
        if (activeRazorpayPlugin != null) {
            activeRazorpayPlugin.onNativePaymentError(code, response);
            activeRazorpayPlugin = null;
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RazorpayNativePlugin.class);
        super.onCreate(savedInstanceState);

        getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED, WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.addJavascriptInterface(new AndroidSecurityBridge(), "AndroidSecurityBridge");

                    WebSettings webSettings = webView.getSettings();
                    webSettings.setDomStorageEnabled(true);
                    webSettings.setDatabaseEnabled(true);
                    webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
                    webSettings.setLoadsImagesAutomatically(true);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                        webSettings.setOffscreenPreRaster(true);
                    }
                }
            }
        });

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
