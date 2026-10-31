package com.salamoon.sanad.preview;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import androidx.browser.customtabs.CustomTabColorSchemeParams;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;

import java.util.Arrays;

/** A browser-backed Android preview of the existing SANAD website. */
public final class MainActivity extends Activity {
    private static final Uri SITE = Uri.parse(
        "https://eslam-mobile-service-app.eslam-hanyram11.chatgpt.site/");
    private static final int DARK = Color.rgb(23, 25, 23);
    private static final int LIME = Color.rgb(215, 255, 0);
    private TextView status;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(DARK);
        scroll.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(),
                insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(),
                insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);
        content.setPadding(dp(28), dp(32), dp(28), dp(32));
        scroll.addView(content, new ScrollView.LayoutParams(-1, -1));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.sanad_mark);
        logo.setContentDescription("شعار سند");
        content.addView(logo, new LinearLayout.LayoutParams(dp(96), dp(112)));
        TextView title = text("سند | SANAD", 32, Color.WHITE);
        title.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        add(content, title, 24);
        add(content, text("نسخة تجربة على الموبايل", 17, LIME), 8);
        add(content, text("افتح سند بنفس الحسابات والخدمات والطلبات الموجودة على الموقع.",
            17, Color.rgb(213, 220, 210)), 24);

        Button open = new Button(this);
        open.setText("فتح سند");
        open.setTextSize(18);
        open.setTextColor(DARK);
        GradientDrawable background = new GradientDrawable();
        background.setColor(LIME);
        background.setCornerRadius(dp(16));
        open.setBackground(background);
        open.setOnClickListener(view -> openSite());
        LinearLayout.LayoutParams buttonLayout = new LinearLayout.LayoutParams(-1, dp(58));
        buttonLayout.topMargin = dp(28);
        content.addView(open, buttonLayout);

        status = text("محتاج اتصال بالإنترنت ومتصفح Chrome أو متصفح يدعم فتح المواقع.",
            14, Color.rgb(185, 195, 183));
        add(content, status, 20);
        add(content, text("الموقع خاص: سجّل أولًا بحساب ChatGPT المسموح له، وبعده حساب سند. "
            + "النسخة دي تعرض موقع سند من خلال المتصفح، وليست نسخة Flutter مستقلة.",
            14, Color.rgb(185, 195, 183)), 18);
        setContentView(scroll);
        if (savedInstanceState == null) scroll.post(this::openSite);
    }

    private void openSite() {
        try {
            CustomTabsIntent tab = new CustomTabsIntent.Builder()
                .setDefaultColorSchemeParams(new CustomTabColorSchemeParams.Builder()
                    .setToolbarColor(DARK).setNavigationBarColor(DARK).build())
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_DARK)
                .setShowTitle(false)
                .setUrlBarHidingEnabled(true)
                .setShareState(CustomTabsIntent.SHARE_STATE_OFF)
                .build();
            String browser = CustomTabsClient.getPackageName(this,
                Arrays.asList("com.android.chrome", "com.sec.android.app.sbrowser",
                    "org.mozilla.firefox", "com.microsoft.emmx"));
            if (browser != null) tab.intent.setPackage(browser);
            tab.launchUrl(this, SITE);
            status.setText("تقدر ترجع لسند من الزر في أي وقت. تسجيل الدخول محفوظ في المتصفح المستخدم.");
        } catch (ActivityNotFoundException error) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, SITE));
            } catch (ActivityNotFoundException noBrowser) {
                status.setText("ثبّت أو فعّل Chrome على الموبايل، وبعدها اضغط فتح سند.");
            }
        }
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        view.setTextDirection(View.TEXT_DIRECTION_FIRST_STRONG);
        view.setLineSpacing(dp(3), 1);
        return view;
    }
    private void add(LinearLayout parent, View view, int top) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.topMargin = dp(top);
        parent.addView(view, params);
    }
    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
