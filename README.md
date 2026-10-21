# Thulir PVC Rack Calculator

Interactive microgreen rack planner with realistic 3D views, vertical and stepped racks, PVC pipe cutting plans and customer estimates.

## Run locally

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. No build step is required. Deploy `dist/` to a static web host.

Features include feet/inches configuration, connector counts, colour-coded pipe cuts, LED glow, fan airflow, sprinkler animations, mobile inspection, fullscreen viewing and simplified pricing with additional costs and profit markup.

Settings and customer details are stored in your browser, not synced between devices. Prices are editable budget references. Verify physical fitting dimensions before construction; effects are illustrative.

Web source revision: b713045f306f2d1a0f85ba85836773eae57dffc6. The separate Capacitor mobile package is not included in this web-source export.
