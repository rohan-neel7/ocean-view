import puppeteer from 'puppeteer';

(async () => {
  console.log('[Benchmark] Starting OceanView Performance Verification...');
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to standard 1080p
  await page.setViewport({ width: 1920, height: 1080 });

  // Expose a function to collect FPS from the Cesium render loop if needed, 
  // but we can measure rendering cycles by intercepting requestAnimationFrame.
  await page.evaluateOnNewDocument(() => {
    window.__fpsData = {
      frames: 0,
      startTime: 0,
      latencyMs: null
    };
    let lastTime = 0;
    
    // We hook into the performance observer to measure fetch/decode latency
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('/api/ocean/model/slice')) {
          window.__fpsData.latencyMs = entry.duration;
        }
      }
    });
    observer.observe({ entryTypes: ['resource'] });
    
    const loop = (time) => {
      if (!window.__fpsData.startTime) window.__fpsData.startTime = time;
      window.__fpsData.frames++;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  try {
    console.log('[Benchmark] Loading application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for the globe to be initialized and layers to load
    // Need to use the puppeteer v22+ syntax for waitForTimeout which is deprecated. We can use a promise instead.
    await new Promise(r => setTimeout(r, 5000));

    // Reset FPS counter for active measurement
    await page.evaluate(() => {
      window.__fpsData.frames = 0;
      window.__fpsData.startTime = performance.now();
    });

    console.log('[Benchmark] Measuring sustained FPS over 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));

    const metrics = await page.evaluate(() => {
      const elapsedSeconds = (performance.now() - window.__fpsData.startTime) / 1000;
      return {
        fps: window.__fpsData.frames / elapsedSeconds,
        latencyMs: window.__fpsData.latencyMs
      };
    });

    console.log(`\n==========================================`);
    console.log(`🚀 OCEANVIEW PHASE 7.7 PERFORMANCE REPORT`);
    console.log(`==========================================`);
    console.log(`Sustained FPS: ${metrics.fps.toFixed(1)} fps (Target: >30)`);
    if (metrics.latencyMs) {
      console.log(`Slice Fetch/Decode Latency: ${metrics.latencyMs.toFixed(1)} ms (Target: <2000)`);
    } else {
      console.log(`Slice Fetch/Decode Latency: NOT DETECTED (Did it use cache or fail?)`);
    }
    
    if (metrics.fps >= 30) {
      console.log(`\n✅ FPS Budget PASSED`);
    } else {
      console.log(`\n❌ FPS Budget FAILED (Expected >= 30, got ${metrics.fps.toFixed(1)})`);
      process.exitCode = 1;
    }
    
    if (metrics.latencyMs && metrics.latencyMs < 2000) {
      console.log(`✅ Latency Budget PASSED`);
    } else if (metrics.latencyMs) {
      console.log(`❌ Latency Budget FAILED (Expected < 2000, got ${metrics.latencyMs.toFixed(1)})`);
      process.exitCode = 1;
    }

  } catch (err) {
    console.error('[Benchmark] Error running benchmark:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
