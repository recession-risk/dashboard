# RecessionRisk.com

An interactive dashboard that nowcasts the probability that the U.S. and euro area
economies are currently in a recession. Live at **[recessionrisk.com](https://recessionrisk.com)**.

The dashboard is the public companion to **"Nowcasting Recession Risk"** by
Francesco Furno and Domenico Giannone (2024), published in the *Handbook of Research
Methods and Applications in Macroeconomic Forecasting* ([link](https://doi.org/10.4337/9781035310050.00011)).

## What it does

Recessions are characterized by the joint occurrence of **soft economic data** and
**tight financial conditions**. The nowcast leverages this insight to produce timely
and reliable estimates of the probability that the economy is undergoing a recession.

- **Timely.** Estimates for a given month are available on the first business day after
  that month closes, because the model relies on indicators that are released quickly.
- **Reliable.** The nowcast is as accurate as professional forecasters at distinguishing
  expansions from contractions in real time, and produces fewer false alarms during
  normal times.
- **Transparent.** Median estimates are reported alongside 5th–95th percentile bands,
  with official NBER (U.S.) and CEPR (euro area) recession dates shown as shaded bands.

## Methodology in brief

A Bayesian logit model combines one macroeconomic and one financial indicator per region:

| Region | Macroeconomic indicator | Financial indicator |
| --- | --- | --- |
| United States | ISM PMI Manufacturing | Composite Indicator of Systemic Stress (CISS) |
| Euro Area | Economic Sentiment Indicator (ESI) | Composite Indicator of Systemic Stress (CISS) |

The model projects official recession dates onto these two predictors. The Bayesian
framework provides confidence intervals around each probability, not just point estimates.
The dashboard offers two views:

- **Latest** — estimates re-fit through the most recent month.
- **Real-Time** — pseudo out-of-sample expanding-window estimates that show how the model
  would have performed in real time.

For full details, see the **FAQ tab** on the site or the working paper.

## The dashboard

- **Nowcast** — recession probability over time for the U.S. and euro area, with selectable
  date ranges, the latest/real-time toggle, and downloadable estimates.
- **Macro-Financial Conditions** — scatter plots showing how recessions and expansions
  separate along the macroeconomic and financial dimensions.
- **FAQs** — methodology, data sources, accuracy, and citation guidance.

## Repository structure

```
index.html       Page markup and the FAQ content
app.js           Dashboard logic (charts, controls, data loading)
styles.css       Styling
data/            Recession-risk time series (CSV) and FRED-formatted output (JSON)
scatter_plots/   Macro-financial conditions figures (SVG)
FAQ/             Figures used in the FAQ section
CNAME            Custom domain for GitHub Pages
```

The site is a static page built with vanilla JavaScript, using
[Chart.js](https://www.chartjs.org/) for plotting and
[PapaParse](https://www.papaparse.com/) for CSV parsing — no build step required.

## Data

The downloadable estimates contain the recession probability time series (median, 5th, and
95th percentiles) for each region and estimation method. Input data has mixed availability:
the CISS is freely available from the ECB and the ESI from the European Commission, while the
ISM PMI Manufacturing requires a subscription. A complete replication package is available at
[amazon-science/nowcasting-recession-risk](https://github.com/amazon-science/nowcasting-recession-risk).

## Citation

> Furno, F., & Giannone, D. (2024). Nowcasting recession risk.
> *Handbook of Research Methods and Applications in Macroeconomic Forecasting*, 156–186.
> https://doi.org/10.4337/9781035310050.00011

## License

Released under the [MIT License](LICENSE.txt). © 2026 Francesco Furno and Domenico Giannone.

Contact: [info@recessionrisk.com](mailto:info@recessionrisk.com)
