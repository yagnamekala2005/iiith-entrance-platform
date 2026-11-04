package com.iiith.entrance;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.razorpay.PaymentData;

import org.json.JSONObject;

@CapacitorPlugin(name = "RazorpayNative")
public class RazorpayNativePlugin extends Plugin {
    private PluginCall pendingCall;

    @PluginMethod
    public void openCheckout(PluginCall call) {
        JSObject options = call.getObject("options");
        if (options == null) {
            call.reject("Checkout options are required.");
            return;
        }

        String keyId = options.optString("key", "");
        String orderId = options.optString("order_id", "");
        if (keyId.isEmpty() || orderId.isEmpty()) {
            call.reject("Razorpay key ID and order ID are required.");
            return;
        }

        if (pendingCall != null) {
            call.reject("A Razorpay checkout is already in progress.");
            return;
        }

        pendingCall = call;
        try {
            ((MainActivity) getActivity()).openRazorpayCheckout(new JSONObject(options.toString()), this);
        } catch (Exception error) {
            pendingCall = null;
            call.reject("Could not open Razorpay checkout.", error);
        }
    }

    public void onNativePaymentSuccess(PaymentData paymentData) {
        if (pendingCall == null) return;

        JSObject result = new JSObject();
        result.put("razorpay_order_id", paymentData.getOrderId());
        result.put("razorpay_payment_id", paymentData.getPaymentId());
        result.put("razorpay_signature", paymentData.getSignature());
        pendingCall.resolve(result);
        pendingCall = null;
    }

    public void onNativePaymentError(int code, String response) {
        if (pendingCall == null) return;

        pendingCall.reject("Razorpay checkout failed (" + code + "): " + response);
        pendingCall = null;
    }
}
