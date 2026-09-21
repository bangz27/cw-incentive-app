package com.cw.incentive;

import static org.junit.Assert.*;

import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Run only on a disposable test device/emulator; never clears app data or records. */
@RunWith(AndroidJUnit4.class)
public class WebViewStorageTest {
    private String evaluate(ActivityScenario<MainActivity> scenario, String js) throws Exception {
        CountDownLatch done = new CountDownLatch(1);
        AtomicReference<String> output = new AtomicReference<>();
        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(js, value -> {
            output.set(value);
            done.countDown();
        }));
        assertTrue("JavaScript callback timeout", done.await(10, TimeUnit.SECONDS));
        return output.get();
    }

    private void awaitWebAssets(ActivityScenario<MainActivity> scenario) throws Exception {
        long deadline = SystemClock.elapsedRealtime() + 30000;
        while (SystemClock.elapsedRealtime() < deadline) {
            if ("true".equals(evaluate(scenario,
                "Boolean(window.CWCalculationEngine && window.CWRecordModel && document.getElementById('calc-size-s'))"))) return;
            SystemClock.sleep(100);
        }
        fail("Packaged calculation and storage scripts did not load in 30 seconds");
    }

    @Test
    public void packagedAssetsAndLocalStorageSurviveRecreation() throws Exception {
        String probeKey = "__cw_phase2_probe__" + UUID.randomUUID();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            awaitWebAssets(scenario);
            scenario.onActivity(activity -> {
                WebView view = activity.getBridge().getWebView();
                assertTrue("DOM storage must be enabled", view.getSettings().getDomStorageEnabled());
            });
            assertEquals("\"https://localhost\"", evaluate(scenario, "location.origin"));
            String previousRecords = evaluate(scenario, "localStorage.getItem('incentive_history')");
            // Store only a separate synthetic probe, never real history or theme keys.
            try {
                assertEquals("true", evaluate(scenario,
                    "(function(){const r=CWCalculationEngine.calculate2W(70,1,10);" +
                    "localStorage.setItem('" + probeKey + "',JSON.stringify(r));" +
                    "return r.grossIncentive===632 && r.netIncentive===617;})()"));
                scenario.recreate();
                awaitWebAssets(scenario);
                assertEquals("true", evaluate(scenario,
                    "(function(){const r=JSON.parse(localStorage.getItem('" + probeKey + "'));" +
                    "return r.parcel===70 && r.netIncentive===617;})()"));
                assertEquals(previousRecords, evaluate(scenario, "localStorage.getItem('incentive_history')"));
            } finally {
                evaluate(scenario, "localStorage.removeItem('" + probeKey + "')");
            }
        }
    }
}
