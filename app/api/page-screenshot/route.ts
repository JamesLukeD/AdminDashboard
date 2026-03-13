import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
  const { yourUrl, theirUrl } = (await req.json()) as { yourUrl: string; theirUrl: string };
  if (!yourUrl || !theirUrl) {
    return NextResponse.json({ error: "Both URLs required" }, { status: 400 });
  }

  async function snap(url: string): Promise<{ screenshot: string; error?: string }> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--font-render-hinting=none",
        ],
      });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-GB,en;q=0.9",
      });
      // Block heavy assets to speed up load
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const type = req.resourceType();
        if (["font", "media"].includes(type)) req.abort();
        else req.continue();
      });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
      // Short pause for CSS/images
      await new Promise((r) => setTimeout(r, 1500));
      // Hide cookie banners / popups
      await page.evaluate(() => {
        const selectors = [
          "#cookie-banner", ".cookie-banner", ".cookie-notice", ".cookie-popup",
          "#cookiebanner", ".cc-window", ".cc-banner", "[class*='cookie']",
          "[id*='cookie']", ".gdpr", "#gdpr", ".consent", "[class*='consent']",
          ".modal-overlay", "[class*='modal']", "[id*='modal']",
          ".popup", "[class*='popup']",
        ];
        selectors.forEach((s) => {
          document.querySelectorAll(s).forEach((el) => {
            (el as HTMLElement).style.display = "none";
          });
        });
        // Also remove fixed overlays
        document.querySelectorAll("*").forEach((el) => {
          const cs = window.getComputedStyle(el);
          if ((cs.position === "fixed" || cs.position === "sticky") && cs.zIndex > "100") {
            (el as HTMLElement).style.setProperty("display", "none", "important");
          }
        });
      });
      const buf = await page.screenshot({ type: "jpeg", quality: 85, fullPage: false });
      return { screenshot: `data:image/jpeg;base64,${Buffer.from(buf).toString("base64")}` };
    } catch (err) {
      return { screenshot: "", error: err instanceof Error ? err.message : String(err) };
    } finally {
      await browser?.close();
    }
  }

  const [yours, theirs] = await Promise.all([snap(yourUrl), snap(theirUrl)]);
  return NextResponse.json({ yours, theirs });
}
