/**
 * One-shot expander: longer body + concrete example + links.
 * Curated imageUrl only when a known-good Commons diagram fits.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FACTS_PATH = path.join(__dirname, "..", "data", "facts.json");

const WIKI = (title) =>
  `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

/** Curated Commons diagrams — only where the graphic illustrates the concept. */
const IMAGES = {
  "Yield curve shapes": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/Yield_curve_20180513.png",
    imageCredit: "Diagram: U.S. Treasury yield curve (Wikimedia Commons)",
  },
  "Term premium": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/a7/Yield_curve_20180513.png",
    imageCredit: "Diagram: U.S. Treasury yield curve (Wikimedia Commons)",
  },
  Contango: {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0b/Contangobackwardation.png",
    imageCredit: "Diagram: Contango vs backwardation (Wikimedia Commons)",
  },
  "Contango and backwardation": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0b/Contangobackwardation.png",
    imageCredit: "Diagram: Contango vs backwardation (Wikimedia Commons)",
  },
  "Efficient frontier": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e1/Markowitz_frontier.jpg",
    imageCredit: "Diagram: Markowitz efficient frontier (Wikimedia Commons)",
  },
  "Order books and spreads": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/14/Order_book_depth_chart.gif",
    imageCredit: "Diagram: Order book depth (Wikimedia Commons)",
  },
  "Bid depth vs last price": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/14/Order_book_depth_chart.gif",
    imageCredit: "Diagram: Order book depth (Wikimedia Commons)",
  },
  "Securitization basics": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/bc/Borrowing_Under_a_Securitization_Structure.png",
    imageCredit: "Diagram: Securitization structure (Wikimedia Commons)",
  },
  "Seniority waterfall": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/33/Securitization-en.PNG",
    imageCredit: "Diagram: Securitization / tranching (Wikimedia Commons)",
  },
  "Implied volatility": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/59/Volatility_smile.01.jpg",
    imageCredit: "Diagram: Volatility smile (Wikimedia Commons)",
  },
  "Sharpe ratio limits": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d7/Sharpe_ratio_graph.jpg",
    imageCredit: "Diagram: Sharpe ratio (Wikimedia Commons)",
  },
  "Central bank balance sheets": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1b/Federal_Reserve_balance_sheet.png",
    imageCredit: "Diagram: Federal Reserve balance sheet (Wikimedia Commons)",
  },
  "Repo financing": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/6a/Repo_transaction_components.png",
    imageCredit: "Diagram: Repo transaction components (Wikimedia Commons)",
  },
  "Bond duration": {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/ad/Bond_Price-Yield_Relationship_Duration_vs_Convexity.png",
    imageCredit:
      "Diagram: Bond price–yield, duration vs convexity (Wikimedia Commons)",
  },
  Convexity: {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/ad/Bond_Price-Yield_Relationship_Duration_vs_Convexity.png",
    imageCredit:
      "Diagram: Bond price–yield, duration vs convexity (Wikimedia Commons)",
  },
};

/** Per-topic enrichment: slightly longer body + concrete example. */
const ENRICH = {
  "Equity as residual claim": {
    body: "Common equity is a residual claim: after creditors, preferred holders, and other senior claims are satisfied, shareholders own what remains of firm value. That residual can compound handsomely in good states — or go to zero in distress — which is why equity expected returns and volatility sit above senior debt. Thinking in priority of claims clarifies capital structure, recovery, and why leverage amplifies equity outcomes.",
    example:
      "Firm assets mark at $100. Senior debt is $70. Equity’s residual claim is $30. If assets fall to $60 in a downturn, debt still claims $60 (subject to recovery frictions) and equity is wiped — a −100% equity outcome on a −40% asset move.",
  },
  "Fixed income cash flows": {
    body: "A vanilla bond is a contractual schedule: periodic coupons plus principal at maturity, priced by discounting each cash flow at rates that embed credit, liquidity, and the yield curve. When discount rates rise, present value falls — the classic inverse price–yield relationship. Everything else (duration, spreads, call risk) is a refinement of that cash-flow machine.",
    example:
      "A 2-year 5% annual coupon bond with $100 face pays $5 then $105. At a flat 5% discount rate, price ≈ $100. If the discount rate jumps to 6%, price ≈ $98.17 — about a 1.8% mark-to-market loss before any credit news.",
  },
  "Commodities vs financial assets": {
    body: "Most commodities pay no coupon or dividend. Returns come from spot moves, futures roll yield along the curve, and sometimes convenience yield for holders of inventory. Physical ownership also burns storage, insurance, and financing — costs financial claims do not share. Treat commodity beta as a different engine than equity or credit.",
    example:
      "You are long a futures curve in 2% annual contango. Ignoring spot drift, rolling the front contract each month leaks roughly ~2% per year in roll yield — so the futures P&L can lag the spot narrative by that bleed.",
  },
  "FX as a relative price": {
    body: "An FX rate is the relative price of two currencies (two monetary and fiscal regimes). Spot FX alone has no coupon; carry and risk premia appear when you fund one currency with another or hedge with forwards. Every unhedged foreign asset is an asset view plus an FX view.",
    example:
      "USD/JPY at 150 means ¥150 per $1. A U.S. investor holding ¥10,000,000 of Japanese equities has equity risk plus FX risk: a move to 160 (dollar stronger) cuts dollar value of the same yen shares by ~6.25% even if local prices are flat.",
  },
  "Alternatives umbrella": {
    body: "‘Alternatives’ bundles private equity, hedge funds, real assets, infrastructure, and private credit — strategies that often trade liquidity, transparency, and fees for different return drivers and lower day-to-day mark correlation. The label is not a risk free lunch; it is a structural choice about how and when risk is observed.",
    example:
      "A $10m commitment to a PE fund may show ~flat marks in year 1 while fees and capital calls run, then jump on an exit in year 5. Same economic risk, very different reported path than a daily-liquidity equity sleeve of equal size.",
  },
  "Primary vs secondary markets": {
    body: "Primary markets raise capital (IPOs, bond syndications, private placements). Secondary markets transfer existing claims between investors. Issuers receive cash only in the primary; secondary prices still matter because they set the opportunity cost of future issuance and the mark for holders.",
    example:
      "Company issues $500m of bonds at par in the primary. A week later the bonds trade at 98 in the secondary. The issuer already has its $500m; existing holders mark a ~2% loss, and the next issue will price off that secondary clearing level.",
  },
  "Exchange vs OTC": {
    body: "Exchanges standardize contracts, concentrate liquidity, and usually clear through a CCP. OTC markets customize terms bilaterally — more flexible, but you inherit counterparty, documentation, and often less transparent pricing. Same economic hedge can be a listed future or an OTC forward with very different ops and risk plumbing.",
    example:
      "Hedging $50m of rate risk with a listed Treasury future uses exchange margin and daily variation margin. The same DV01 via an OTC swap needs an ISDA, CSA collateral terms, and bilateral (or cleared) counterparty management — different ops even if the macro view matches.",
  },
  "Central clearing": {
    body: "A CCP novates trades: it becomes buyer to every seller and seller to every buyer. Counterparty risk is mutualized through margin and default funds rather than eliminated. Clearing concentrates risk in a supervised node — resilient by design, systemic if that node is mismanaged.",
    example:
      "A and B trade a swap. After novation, A faces the CCP and B faces the CCP — not each other. If B defaults, the CCP uses B’s margin and mutualized resources; A’s replacement risk is to the clearinghouse process, not B’s bankruptcy estate directly.",
  },
  "Order books and spreads": {
    body: "The bid–ask spread compensates liquidity providers for inventory risk and adverse selection. Tight spreads signal competitive liquidity; wide spreads flag uncertainty, thin books, or informed flow. Last trade is a point sample; the book is the cost of actually trading.",
    example:
      "Stock shows last trade $100.00. Best bid $99.90 / best ask $100.10 (10¢ spread). Buying 1 share costs $100.10; the round-trip bid–ask tax on a tiny clip is 20¢ (~0.2%). Walking a thin book for 50,000 shares costs far more than that top-of-book print.",
  },
  "Price discovery": {
    body: "Price discovery is how trading aggregates dispersed information into a quote. Illiquid or fragmented venues do not lack a price — they have noisier, slower discovery and larger gaps between prints. Policy and microstructure reforms often aim at discovery quality, not just average volume.",
    example:
      "A small-cap prints $12.00 on 200 shares, then $12.40 on 5,000 shares after a research note. The ‘price’ moved 3.3%, but discovery was a sequence of thin prints — using the first print as a fair-value anchor for a block trade would misstate impact.",
  },
  "Dark pools": {
    body: "Dark pools match orders without displaying depth pre-trade, mainly to reduce signaling for large institutional size. The trade-off is less pre-trade transparency and potential fragmentation of lit liquidity. They are a tool for minimizing information leakage, not a separate asset class.",
    example:
      "A fund needs to sell 2% of ADV in a name. Showing that size on the lit book can push the offer down before the order finishes. Routing slices to a dark pool aims to fill closer to mid with less displayed signal — at the cost of uncertain fill probability.",
  },
  "Settlement vs trading": {
    body: "Trade date is when you agree; settlement is when cash and securities actually exchange (often T+1 for equities). Settlement risk, fails, and custodian pipelines matter as much as the screen price for real balance-sheet outcomes.",
    example:
      "You buy shares on Monday (T). Under T+1, cash and stock exchange Tuesday. If you mark the position Monday night you already have price risk, but funding and securities ownership finalize on settlement — fails or holiday calendars can still delay that final exchange.",
  },
  "Discounted cash flow": {
    body: "DCF says value equals expected future cash flows discounted for time and risk. The algebra is simple; the craft is honest forecasts, a coherent discount rate, and humility about terminal-value dominance. Precision past the decimal usually overstates knowledge.",
    example:
      "Project pays $10 next year and $10 the year after, then zero. At a 10% discount rate, PV = 10/1.1 + 10/1.1² ≈ $17.36. Raise the discount rate to 12% and PV ≈ $16.83 — a ~3% value change from a 200 bp rate assumption shift alone.",
  },
  "Enterprise vs equity value": {
    body: "Enterprise value (EV) is the value of core operations to all capital providers. Equity value ≈ EV − net debt (and similar claims). Mixing EV multiples with equity metrics (or ignoring net cash) is a classic way to mis-compare levered and unlevered firms.",
    example:
      "EV = $800m, net debt = $300m ⇒ equity value = $500m. At 50m shares, equity value implies $10/share. An ‘EV/EBITDA of 8×’ is not comparable to a ‘P/E of 8×’ without translating claims and earnings definitions.",
  },
  "Multiples are abbreviated DCFs": {
    body: "Trading multiples (P/E, EV/EBITDA) compress growth, margins, risk, and capital intensity into one ratio. A ‘cheap’ multiple can be mispricing — or correctly priced low growth, high leverage, or poor earnings quality. Always ask which DCF assumptions the multiple embeds.",
    example:
      "Two firms print 10× forward EPS. Firm A grows EPS 15% with light capex; Firm B grows 2% with heavy reinvestment. Same multiple, very different implied IRRs once you unpack the growth and reinvestment story behind the abbreviation.",
  },
  "Cost of capital": {
    body: "WACC blends after-tax cost of debt and cost of equity at target weights. Using yesterday’s capital structure for tomorrow’s project, or discounting equity cash flows at WACC, quietly breaks the model. Match the discount rate to the cash-flow claim.",
    example:
      "Target weights 40% debt / 60% equity. Cost of debt 5% (tax 25% ⇒ after-tax 3.75%), cost of equity 10%. WACC = 0.4×3.75% + 0.6×10% = 7.5%. Discounting levered equity free cash flows at 7.5% (instead of 10%) double-counts the debt benefit.",
  },
  "Risk-free rate building block": {
    body: "The risk-free rate anchors discount rates. Desks typically use government yields matching cash-flow currency and horizon, then layer credit, equity, and liquidity premia. Currency mismatch here is a silent valuation bug.",
    example:
      "Valuing EUR cash flows with a USD Treasury 10y as ‘risk-free’ ignores EUR rate levels and FX. If German 10y is 2.5% and UST 10y is 4.0%, using 4% as the EUR risk-free base overstates the discount rate before any equity premium is added.",
  },
  "Terminal value dominance": {
    body: "In many DCFs, most of the value sits in the terminal value. Small changes in long-run growth or exit multiple dwarf year-1–5 forecast precision. Stress the terminal assumptions harder than the near-term spreadsheet cosmetics.",
    example:
      "Explicit forecast PV = $40. Terminal value PV = $160 (80% of total $200). Cutting the perpetual growth rate from 3% to 2% might drop terminal PV to ~$130, wiping ~$30 (~15%) of firm value while ‘years 1–5’ barely move.",
  },
  "Risk and expected return": {
    body: "In equilibrium models, higher systematic risk should earn higher expected return. Realized return is noisy; expected return is what the market prices ex ante. Conflating a lucky path with a priced risk premium is how backtests become marketing.",
    example:
      "Asset priced for 8% expected return with 15% vol. Over one year it returns −5%. That realization does not prove the ex-ante premium was wrong — one draw from a wide distribution. Ten years of underperformance is a harder signal; one year is mostly noise.",
  },
  "Idiosyncratic vs systematic risk": {
    body: "Idiosyncratic risk can be diversified in a broad portfolio; systematic risk cannot. CAPM-style pricing cares about non-diversifiable exposure. Concentrated stock pickers bear both — and need compensation (or skill) for the diversifiable slice markets do not have to pay.",
    example:
      "A single stock has 40% vol; half is idiosyncratic. In a 50-stock equal-weight book of similar names with low residual correlation, idiosyncratic vol shrinks toward ~40%/√50 ≈ 5.7%, while market beta risk remains.",
  },
  "Volatility is not the only risk": {
    body: "Standard deviation treats upside and downside symmetrically and ignores liquidity, path dependence, and drawdown pain. A strategy can look low-vol until the left tail arrives. Risk management needs more than a single second-moment summary.",
    example:
      "Strategy A: +1% most months, −20% in crashes, historical vol 8%. Strategy B: ±3% monthly noise, vol 10%, shallow drawdowns. A vol-only screen prefers A — until the crash month that vol averages had down-weighted.",
  },
  "Diversification math": {
    body: "Portfolio variance depends on weighted variances and covariances. Adding a volatile asset can still reduce portfolio risk if correlation is low enough. Diversification fails when correlations spike in stress — precisely when you wanted the hedge.",
    example:
      "Two assets, each 20% vol, equal weight. If correlation = 0, portfolio vol ≈ 14.1%. If correlation rises to 1 in a crisis, portfolio vol = 20%. Same weights, very different risk when the correlation regime shifts.",
  },
  "Efficient frontier": {
    body: "Mean–variance optimization maps portfolios that maximize expected return for a given variance. Estimated inputs are noisy, so unconstrained ‘optimal’ weights often concentrate and churn. Regularization and constraints are part of professional practice, not optional extras.",
    example:
      "Optimizer sees Asset X expected return 12% vs 8% for Y, similar vol, and dumps 80% in X. After estimation error, realized excess of X was noise — the ‘frontier’ portfolio was an estimation artifact, not a free lunch.",
  },
  "Beta as co-movement": {
    body: "Beta measures sensitivity to a market factor, not standalone ‘riskiness.’ A low-beta name can still blow up idiosyncratically; a high-beta name can be a leveraged play on a factor everyone already owns. Know which risk you are being paid for.",
    example:
      "Stock returns ≈ 1.5 × market moves in the estimation window (β ≈ 1.5). If the market is −10%, the linear beta story predicts ~−15% for the stock before alpha/residual. A −30% print means large idiosyncratic underperformance on top of beta.",
  },
  "Sharpe ratio limits": {
    body: "Sharpe ratio is excess return per unit of volatility. It assumes roughly symmetric, stable returns and ignores liquidity, leverage constraints, and tail shape. Selling crash insurance can inflate Sharpe until the crash — an old trap.",
    example:
      "Fund returns 10% with 10% vol; risk-free is 4% ⇒ Sharpe = (10−4)/10 = 0.6. Another fund returns 9% with 6% vol by shorting vol ⇒ Sharpe = 0.83 — until a −25% gap month that the ratio never priced.",
  },
  "Correlation ≠ causation in markets": {
    body: "Sample correlations are unstable across regimes. Assets that diversify in calm markets often co-crash when funding liquidity dries up. Treat historical correlation as a clue for stress design, not a contract with the future.",
    example:
      "Credit and equity show correlation 0.2 in a calm five-year window. In a funding panic both sell off together and realized correlation prints 0.8 for a quarter — destroying the diversification the calm sample promised.",
  },
  "Bond duration": {
    body: "Macaulay duration is the weighted-average time to cash flows; modified duration approximates percentage price change for a yield move. Longer duration means more rate sensitivity — including more pain for ‘safe’ bonds when yields rise.",
    example:
      "Modified duration ≈ 7. A +100 bp parallel yield rise implies ≈ −7% price move (before convexity). On a $10m DV01-relevant book, that is roughly a $700k mark-to-market hit for a clean parallel shift.",
  },
  Convexity: {
    body: "Duration is a linear approximation; convexity captures curvature. For plain vanilla bonds, positive convexity means prices rise more (and fall less) than duration predicts for large yield moves — valuable, and usually not free in yield terms.",
    example:
      "Duration predicts −7% for +100 bp. With meaningful positive convexity, actual price drop might be ~−6.5% instead. For −100 bp, price might rise ~+7.5% rather than +7% — the asymmetry duration alone misses.",
  },
  "Yield curve shapes": {
    body: "The yield curve embeds rate expectations, risk premia, and sometimes segmented demand. Inversion (short rates above long) has often preceded slowdowns, but it is a signal about the curve — not a timing oracle for equities or credit spreads.",
    example:
      "2y yield 5.0%, 10y yield 4.2% ⇒ 2s10s = −80 bp (inverted). That says the curve prices lower forward short rates and/or term-premium effects — it does not by itself say ‘sell equities next month.’",
  },
  "Credit spreads": {
    body: "A credit spread compensates for expected default loss, risk premia, and liquidity. Spread tightening is not always fundamentals improving — it can be a hunt for yield compressing risk compensation. Read spreads as a price of risk, not a moral score.",
    example:
      "Corporate yield 6.5%, matched Treasury 4.0% ⇒ spread = 250 bp. If expected loss is ~80 bp and the rest is risk/liquidity premium, a crush to 150 bp may be premium compression rather than a miraculous drop in default odds.",
  },
  "Investment grade vs high yield": {
    body: "Ratings bucket default risk, but the BB/BBB boundary is discontinuous for many mandates. Forced selling around downgrades can move prices more than the change in fundamentals alone would imply — a market-structure overlay on credit analysis.",
    example:
      "A BBB bond is downgraded to BB. IG-only funds must sell. Even if model-implied default probability barely changed that week, forced flow can gap the bond 3–5 points as the eligible-buyer set shrinks.",
  },
  "Callable bonds": {
    body: "Issuers call bonds when refinancing is advantageous — typically when rates fall. Investors are short that call option, so callables offer higher yields than bullets and underperform in strong rallies when calls cap price upside.",
    example:
      "Callable bond priced to a 6% yield to maturity, but economically likely called in 3 years at a 4.5% yield to call. When rates drop, price stalls near the call price while a non-callable peer rallies further — the short call bites.",
  },
  "Inflation-linked bonds": {
    body: "Linkers adjust principal (and coupons) with an inflation index. Breakevens implied by linker vs nominal yields are market inflation compensation — not a pure forecast, because of liquidity and risk premia in both legs.",
    example:
      "10y nominal yield 4.0%, 10y linker real yield 1.5% ⇒ breakeven ≈ 2.5%. If realized CPI inflation averages 2.0% over the decade, the linker underperforms the nominal ex ante breakeven story (ignoring other premia).",
  },
  "Repo financing": {
    body: "A repo is a collateralized loan dressed as a sale-and-repurchase. It funds inventories and levered positions; stress in repo is often stress in the plumbing of rates and credit trading. Haircuts and eligible collateral define the true leverage.",
    example:
      "Dealer repos $100m of Treasuries with a 2% haircut ⇒ cash raised $98m. If haircuts jump to 5% in stress, the same inventory funds only $95m — a $3m sudden funding gap that can force sales.",
  },
  "Forwards vs futures": {
    body: "Forwards are OTC, customized, and bilaterally margined (if at all). Futures are exchange-traded, standardized, and marked to market daily through clearing. Same economic idea; different counterparty, liquidity, and cash-flow timing profiles.",
    example:
      "Long a forward that goes $1m in-the-money: gain is mostly unrealized until expiry or close-out (unless CSA collateral calls). The same move on a future pulls ~$1m variation margin in cash through the clearinghouse day by day.",
  },
  "Options as asymmetric payoffs": {
    body: "A call (put) pays if the underlying finishes above (below) the strike — otherwise expires worthless. Premium buys asymmetry: limited loss for the buyer, potentially large gain; the seller is short that convexity and collects the premium.",
    example:
      "Stock at $100. One-year $100 call costs $8. At expiry, stock at $120 ⇒ call payoff $20, net +$12. At $90 ⇒ payoff $0, net −$8. Upside participates; downside is capped at premium.",
  },
  "Put-call parity": {
    body: "For European options on non-dividend underlyings, put-call parity links calls, puts, spot, and bonds so no arbitrage holds. When parity appears to break after costs, check dividends, early exercise, borrow, and funding — before declaring free money.",
    example:
      "Parity: C − P = S − K·e^{−rT}. If S=100, K=100, rT≈0, then C−P≈0 for ATM European options. If the call trades $2 richer than the put with no dividend, an arb book sells call, buys put and stock (or the synthetic equivalent) within costs.",
  },
  "Implied volatility": {
    body: "Implied vol is the volatility input that makes an option model match market price. It is the market’s price of uncertainty in vol units — not a promise of realized volatility. Skews and smiles across strikes exist for a reason.",
    example:
      "ATM option priced at 20% implied vol. Realized over the life prints 15%. The long-vol buyer overpaid relative to realized; the seller earned the 5 vol-point gap (before path/gamma details). Implied was a quote, not a forecast that had to print.",
  },
  "Greeks: delta and gamma": {
    body: "Delta is first-order sensitivity to the underlying; gamma is how fast delta changes. Dealers hedging short gamma buy strength and sell weakness — which can amplify moves when positioning is one-way.",
    example:
      "Short an ATM option with delta ~0.50 and large gamma. Stock pops +2%: delta might jump to ~0.65, forcing the hedger to buy more stock into strength to re-hedge — mechanically adding demand as price rises.",
  },
  "Interest rate swaps": {
    body: "A plain vanilla IRS exchanges fixed for floating on a notional (no principal exchange). It is the workhorse for managing duration and expressing views on short-rate paths versus fixed. DV01, not notional, is the risk unit.",
    example:
      "Pay fixed 3% on $100m 10y swap vs SOFR. If forward rates reprice higher, the pay-fixed position gains (fixed looks cheap). Rough 10y DV01 ~ $8–9k per bp on $100m — a 10 bp sell-off in rates is ~$80–90k mark gain order of magnitude.",
  },
  "Credit default swaps": {
    body: "CDS transfers credit risk: protection buyer pays a spread; seller pays on credit events. CDS is a liquid lens on credit views and can diverge from cash bonds via funding, cheapest-to-deliver, and basis dynamics.",
    example:
      "Buy 5y CDS protection at 100 bp on $10m notional ≈ $100k/year premium. On a credit event with 40% recovery, payoff ≈ $6m (60% LGD × notional), minus accrued — convex credit exposure without owning the bond.",
  },
  "Basis risk": {
    body: "Hedging with an imperfectly correlated instrument leaves basis risk — hedge and exposure do not move 1:1. ‘Hedged’ books blow up when the basis widens in the scenario you thought you neutralized.",
    example:
      "Airline hedges jet-fuel cost with crude oil futures. Crude −10%, jet fuel −3% (crack moves). The ‘hedge’ gains less than the fuel cost relief expected — residual crack/basis risk dominated the month.",
  },
  "Notional vs economic exposure": {
    body: "Derivative notionals can dwarf cash markets while net risk is smaller — or leverage can hide large economic exposure behind modest cash outlay. Translate to delta, DV01, or CS01; raw notional is a headline, not a risk measure.",
    example:
      "$1bn notional of a 0.01-delta far OTM option is only ~$10m equivalent underlying delta. Meanwhile $50m cash stock is $50m delta. Comparing notionals alone would wildly mis-rank the equity exposure.",
  },
  "Market liquidity": {
    body: "Market liquidity is the ability to trade size quickly at low cost without moving price much. It is fragile: depth can vanish when volatility jumps and dealers pull inventory. Liquidity is a risk factor, not a free constant.",
    example:
      "In calm markets you exit a $25m credit position at +5 bp concession. In a stress week the same exit needs +40 bp and two days — identical ‘position size,’ very different liquidity cost.",
  },
  "Funding liquidity": {
    body: "Funding liquidity is the ability to raise cash or roll financing. When haircuts rise and repo lines shrink, investors sell what they can, not what they should — linking funding stress to market price spirals.",
    example:
      "Levered fund finances $200m assets with $160m repo. Haircuts rise so maximum financing drops to $140m. It must sell $20m of assets into a falling market to delever — funding liquidity became market liquidity demand.",
  },
  "Liquidity premium": {
    body: "Illiquid assets often embed a liquidity premium in expected return — compensation for lockups and exit costs. That premium can evaporate in a rush for the door when everyone re-prices liquidity at once.",
    example:
      "Private credit targets +150 bp over liquid loans for illiquidity. In a redemption wave, secondary marks gap −5 points. The ‘premium’ was earned in calm years and given back when liquidity was scarce.",
  },
  "Bid depth vs last price": {
    body: "Last trade is a point; the book is a surface. A quiet last price with a hollow book is not the same market as a tight, deep book. Impact cost lives in the depth you walk through, not the print you remember.",
    example:
      "Last trade $50.00 on 100 shares. The bid stack shows only 2,000 shares within 1%. Selling 20,000 shares will walk through multiple levels — your average sale price might be $49.60 even though ‘the price’ was $50.",
  },
  "Systemic risk": {
    body: "Systemic risk is distress propagating through interconnected balance sheets, markets, and confidence. Idiosyncratic failure is a credit event; systemic failure is a network failure. Capital and liquidity rules aim at the network, not just the node.",
    example:
      "One dealer fails on bilateral derivatives. Counterparties scramble to replace hedges, spreads gap, and margin calls hit other levered players — a single default becomes a market-wide liquidity and mark-to-market shock.",
  },
  "Too interconnected to fail": {
    body: "Size, complexity, and interconnectedness create moral hazard and fire-sale externalities. Post-crisis policy tried to internalize costs via capital, resolution regimes, and clearing — none make contagion impossible.",
    example:
      "A globally active bank has unmatched uncleared derivatives with 40 dealers. Resolution planning must unwind or transfer that web over a weekend — interconnection, not just total assets, drives the ‘too difficult to fail’ problem.",
  },
  "Fire sales": {
    body: "Forced selling into illiquid markets pushes prices below fundamental value, impairs other holders’ marks, and triggers more selling. Leverage and mark-to-market rules can turn a liquidity event into a solvency spiral.",
    example:
      "Fund must raise $100m cash by Friday. It dumps the most liquid credits first, pushing spreads wider. Other funds mark losses and hit their own gates — the fire sale price becomes everyone’s new reference.",
  },
  "Leverage amplification": {
    body: "Leverage amplifies gains and losses and shortens the time you can be wrong. The same return target with more leverage means thinner buffers against volatility, margin calls, and gap risk.",
    example:
      "$10m equity supports $50m assets (5× leverage). A 10% asset drop is a 50% equity loss. At 2× leverage the same asset move is a 20% equity loss — identical market move, different survival odds.",
  },
  "Value at Risk caveats": {
    body: "VaR estimates a loss threshold at a confidence level over a horizon. It is silent about how bad the tail beyond that threshold is — and historically unstable when correlations and volatilities jump together.",
    example:
      "1-day 95% VaR = $5m means ~1 in 20 days may lose more than $5m — but VaR does not say whether the breach is $5.1m or $40m. Two desks with identical VaR can have wildly different expected shortfall.",
  },
  "Stress testing": {
    body: "Stress tests ask ‘what if’ under severe but plausible scenarios rather than average history. Good stresses break multiple assumptions at once (rates, spreads, liquidity, FX). Bad ones only move the variable that flatters the book.",
    example:
      "A useful stress: +200 bp rates, +150 bp credit spreads, equity −25%, and haircuts +3 pts together. A weak stress that only bumps rates +25 bp while ignoring spread and liquidity will miss the joint failure mode.",
  },
  "Counterparty risk": {
    body: "OTC exposure is not just today’s mark — it is the risk your counterparty fails when the trade has positive replacement value. Netting, collateral, and clearing exist because replacement risk is real.",
    example:
      "Your IRS is +$20m MTM vs Dealer X with no collateral. X defaults. You must replace the swap at market and file as an unsecured creditor for the $20m — counterparty risk crystallized as replacement cost.",
  },
  "Operational risk": {
    body: "Ops risk covers process failures, cyber, fraud, and model misuse — losses without a market move. It is often underestimated because it is lumpy, firm-specific, and does not sit neatly in a factor model.",
    example:
      "A fat-finger hedge leaves a desk double-long overnight. Markets gap −3% before discovery. The loss is operational (control failure), even though it shows up as market P&L.",
  },
  "Model risk": {
    body: "Every valuation and risk model is a simplified map. Model risk is when the map is wrong in the region that matters — wrong vol dynamics, wrong default correlation, wrong liquidity assumptions — usually discovered live.",
    example:
      "CDO mezzanine priced with Gaussian copula default correlation of 20%. In a housing stress, effective correlation spikes and mezzanine losses far exceed the model’s ‘unlikely’ region — the model risk was the correlation assumption.",
  },
  "Currency hedging": {
    body: "Hedging foreign assets with forwards removes much of FX P&L but introduces roll costs/benefits from interest differentials (carry). Unhedged international equity is an equity view plus an FX view whether you intended both or not.",
    example:
      "EAFE equities +12% in local currency; USD strengthens 8% vs the basket. Unhedged USD return ≈ +4%. A full FX hedge keeps ~+12% equity local return minus hedge carry — very different year than the unhedged print.",
  },
  "Purchasing power parity": {
    body: "PPP suggests exchange rates should align with relative price levels over long horizons. Short-run FX is dominated by rates, flows, and risk appetite — so PPP is a weak magnet, not a trading rule.",
    example:
      "Big Mac or CPI baskets imply fair USD/XYZ 20% cheaper than spot. Spot can stay ‘rich’ for years while rate differentials dominate. PPP may guide a 10y mean-reversion story; it rarely times the next quarter.",
  },
  "Carry trade mechanics": {
    body: "FX carry borrows low-yielding currencies to fund high-yielding ones, harvesting the rate differential if spot does not move adversely. It often works until a volatility spike forces a stampede out of crowded short-vol/carry positions.",
    example:
      "Borrow JPY at ~0%, invest in AUD at ~4%, target ~4% carry if spot is unchanged. A sudden 8% JPY spike vs AUD in a risk-off week can wipe two years of carry in days.",
  },
  "Covered interest parity": {
    body: "Covered interest parity links spot, forward, and interest differentials via FX-swap arbitrage. Persistent CIP deviations after 2008 highlighted balance-sheet and regulatory frictions — ‘arbitrage’ needs scarce balance sheet.",
    example:
      "Interest differential says 1y forward should be −2% vs spot. Market forward is −1.5%. The 50 bp CIP basis looks like free money — until you price balance-sheet capital, G-SIB scores, and funding constraints that stop the arb.",
  },
  "Equity risk premium": {
    body: "The equity risk premium is the expected excess return of equities over a risk-free asset. It is not directly observable; history, surveys, and implied earnings yields disagree — and the true premium moves with risk appetite.",
    example:
      "Earnings yield 5%, real risk-free 1.5% ⇒ rough implied ERP ~3.5% before growth adjustments. Using a 100-year historical ERP of ~6% instead would justify much higher valuations — same concept, very different input.",
  },
  "Monetary policy transmission": {
    body: "Policy rates transmit through funding costs, discount rates, credit supply, FX, and expectations. Asset prices often move on the path of policy, not just the level — forward guidance is part of the instrument set.",
    example:
      "Central bank holds the policy rate at 5% but convincingly signals cuts in six months. Front-end forwards rally, discount rates for risk assets ease, and equities can re-rate before any actual cut prints.",
  },
  "Real vs nominal rates": {
    body: "Nominal rates include expected inflation (and inflation risk). Real rates matter for discounting real cash flows and for the attractiveness of holding duration. Mistaking a nominal move for a real one misreads the macro impulse.",
    example:
      "Nominal 10y rises from 3% to 4% while breakeven inflation rises from 2% to 3%. Real yield ≈ unchanged at ~1%. The ‘rates up’ headline was mostly inflation compensation, not a tighter real discount rate.",
  },
  "Fiscal and sovereign risk": {
    body: "Sovereign debt risk depends on debt dynamics, growth, inflation, currency of issuance, and institutional credibility. Local-currency issuers can inflate; hard-currency debt cannot print its way out — different beasts.",
    example:
      "Country A’s local-currency 10y yields 8% with 6% inflation. Country B’s USD eurobond yields 8% with a thin reserve buffer. Same yield number; B cannot monetize the liability in USD — credit risk is not identical.",
  },
  "Index investing mechanics": {
    body: "Cap-weighted index funds mechanically buy more of what rose and less of what fell. That minimizes turnover and fees, but concentrates in winners and is not a ‘neutral’ fair-value view — it is a rules-based portfolio.",
    example:
      "Mega-cap is 7% of the index and rallies to become 10%. Passive inflows buy more of it at the new weight. Active ‘underweight the winner’ is a bet against that mechanical demand.",
  },
  "ETFs and creation/redemption": {
    body: "Authorized participants arbitrage ETF prices toward NAV via creation/redemption. That usually keeps ETFs tight to value — until underlying markets are stressed and the arbitrage pipeline itself gets costly or impaired.",
    example:
      "ETF trades at a 0.05% premium to NAV; APs create shares and sell ETF / buy basket. In a bond-market stress, ETF discounts can gap to 1–2% when creating/redeeming the underlying basket becomes hard or expensive.",
  },
  "Mutual fund vs hedge fund": {
    body: "Traditional mutual funds are typically long-only, daily liquidity, and tightly regulated on leverage and shorting. Hedge funds vary widely: more flexible tools, less liquidity, and fee structures that assume skill can overcome costs.",
    example:
      "Mutual fund: 1% fee, daily redemptions, no shorting. Hedge fund: 1.5% + 20% incentive, quarterly liquidity, long/short. Same ‘equity market’ label; very different tools, constraints, and fee drag on net alpha.",
  },
  "Private equity J-curve": {
    body: "PE cash flows often show a J-curve: early fees and investments before distributions. IRR can look heroic or horrible depending on exit timing — TVPI/MOIC complement IRR by showing multiple of capital.",
    example:
      "Years 0–2: −$20 of calls/fees, NAV $15 (J-curve dip). Years 3–7: distributions bring total value to $30 on $20 paid-in ⇒ TVPI 1.5×. Early IRR looked awful; end IRR depends on when exits hit the IRR clock.",
  },
  "Closed-end discounts": {
    body: "Closed-end funds can trade at persistent discounts or premiums to NAV because shares are not continuously created/redeemed like open-ends. The discount prices structure, sentiment, and sometimes governance — not just ‘the assets.’",
    example:
      "Fund NAV $20/share, market price $17 ⇒ 15% discount. Buying at $17 embeds a possible narrowing toward NAV plus asset returns — or a wider discount if sentiment worsens. Structure risk is real.",
  },
  "Securitization basics": {
    body: "Securitization pools assets and issues tranches with different seniority. Senior tranches absorb losses last; equity/first-loss absorbs first. Tranching redistributes risk — it does not delete it from the system.",
    example:
      "$100m loan pool. Structure: $80m senior, $15m mezz, $5m equity. First $5m of losses wipe equity; next $15m hit mezz; senior only takes losses beyond $20m cumulative. Same pool risk, sliced by priority.",
  },
  "Seniority waterfall": {
    body: "In distress, absolute priority says senior creditors are paid before junior claims and equity. In practice, negotiations, DIP financing, and intercreditor fights make recoveries a legal and strategic game — not a spreadsheet identity.",
    example:
      "Firm value in bankruptcy = $60. Claims: $50 senior, $40 junior, equity. Absolute priority: senior recovers $50 (100%), junior $10 (25%), equity $0. A negotiated plan that gives equity a tip violates pure APR for peace or speed.",
  },
  Covenants: {
    body: "Covenants constrain borrower behavior (leverage, liens, restricted payments). Loose ‘covenant-lite’ structures shift more risk to lenders; tight covenants can trigger defaults earlier. They are trade-offs, not moral categories.",
    example:
      "Maintenance covenant: net leverage must stay ≤4.0×. EBITDA drops and leverage prints 4.3× ⇒ technical default / springing rights even if interest is current. Covenant-lite may have only incurrence tests when taking new debt.",
  },
  "Recovery rates": {
    body: "Expected loss ≈ PD × LGD (1 − recovery). Recoveries vary by seniority, collateral, jurisdiction, and cycle. Pricing credit on PD alone is half a model.",
    example:
      "PD = 2%, senior secured recovery assumption 60% (LGD 40%) ⇒ expected loss ≈ 0.8%/year. Same PD with senior unsecured recovery 30% (LGD 70%) ⇒ expected loss ≈ 1.4%/year — spread needs to reflect LGD, not just PD.",
  },
  "Agency costs": {
    body: "Managers, shareholders, and creditors have overlapping but conflicting incentives. Debt can discipline free cash flow; near distress it can encourage risk-shifting. Capital structure is partly a governance technology.",
    example:
      "Near-insolvent equity holders prefer a high-variance ‘swing for the fences’ project: upside is theirs, downside hits creditors. Creditors would prefer asset preservation. That conflict is classic agency cost of debt.",
  },
  "Modigliani–Miller insight": {
    body: "In frictionless markets, capital structure does not change firm value — it slices claims differently. Taxes, bankruptcy costs, and information frictions are why MM is a benchmark, not a trading manual.",
    example:
      "Unlevered firm value $100. MM world: add $40 debt, equity becomes $60, total still $100. With tax shields, value may rise by PV(tax shield); with distress costs, value falls — frictions break invariance.",
  },
  "Free cash flow": {
    body: "Free cash flow to firm is operating cash after tax and reinvestment needs, before debt service. Earnings can be managed; cash flow still needs honest working capital and capex. Quality of earnings lives here.",
    example:
      "EBIT $50, tax $10, D&A $8, capex $12, ΔNWC +$5 ⇒ FCFF ≈ 50−10+8−12−5 = $31. A firm can grow EPS while FCFF shrinks if working capital and capex absorb the cash.",
  },
  "Working capital cycle": {
    body: "Cash conversion depends on receivables, inventory, and payables timing. Growth that outruns working capital funding can bankrupt a profitable firm. Liquidity planning is not optional for high-growth stories.",
    example:
      "DSO 40 days, DIO 50, DPO 30 ⇒ cash conversion cycle ≈ 60 days. Sales jump $120m/year (~$10m/month) and CCC stays 60 days ⇒ roughly $20m extra WC funding need — profit without cash if not financed.",
  },
  "Dividend vs buyback": {
    body: "Dividends and buybacks both return cash; buybacks are more flexible and change share count. Neither creates value by magic — they redistribute cash and signal (sometimes falsely) about undervaluation and future investment needs.",
    example:
      "Firm has $100m excess cash, 50m shares at $20. $100m dividend = $2/share. $100m buyback at $20 retires 5m shares. Equity value drops by cash paid either way; per-share math differs with buybacks if timing/price is wrong.",
  },
  "Efficient market hypothesis": {
    body: "EMH says prices reflect available information such that risk-adjusted abnormal profits are elusive. Markets can be hard to beat and still display bubbles, crashes, and slow diffusion — efficiency is a spectrum, not a binary.",
    example:
      "Earnings beat hits the wire; price adjusts within seconds on liquid names. That micro efficiency can coexist with a multi-year sector valuation extreme — different horizons of ‘information’ and limits to arbitrage.",
  },
  "Limits to arbitrage": {
    body: "Even when a mispricing looks obvious, shorting costs, funding constraints, and career risk can stop arbitrageurs from correcting it. Prices can stay wrong longer than a mark-to-market book can stay solvent.",
    example:
      "Dual-listed shares trade at a 20% gap. Arb requires shorting the rich line and buying the cheap one. Borrow fees + tracking risk + monthly drawdown limits force the desk to cut before convergence — mispricing persists.",
  },
  "Noise traders": {
    body: "Noise trading injects demand unrelated to fundamentals, adding volatility and sometimes creating the mispricings professionals try to harvest. Liquidity provision is profitable until noise becomes a stampede.",
    example:
      "Retail flow aggressively buys a meme name with no change in cash flows. Price doubles; shorts face buy-ins. Fundamentals-based ‘fair value’ was right eventually — funding and timing failed first.",
  },
  "Behavioral biases in markets": {
    body: "Overconfidence, loss aversion, and extrapolation show up in flows and anomalies. Knowing the bias list does not immunize you — institutions have mandates and incentives that recreate the same patterns at scale.",
    example:
      "After three strong years, investors extrapolate and pile into the winning factor just as valuations are richest. The ‘bias’ is in the flow; the drawdown that follows is the bill for extrapolation.",
  },
  "Alpha vs beta": {
    body: "Beta is compensated exposure to systematic factors; alpha is residual performance after those exposures. Much marketed ‘alpha’ is unacknowledged beta (credit, liquidity, volatility selling) wearing a better fee.",
    example:
      "Fund beats the S&P by 3% but with 0.3 higher beta and a large credit overweight. After regressing on market + credit factors, residual alpha ≈ 0. True edge was factor exposure, not security selection.",
  },
  "Benchmark relative risk": {
    body: "Active managers are often judged on tracking error versus a benchmark, not absolute volatility. That can push herding into benchmark names — career risk is a market-structure feature.",
    example:
      "Benchmark weight in MegaCap is 8%. Manager holds 5% (underweight 3%). MegaCap rallies 20% and the manager’s tracking error spikes and relative performance lags — even if absolute return is fine. Mandate risk ≠ market risk.",
  },
  "Information ratio": {
    body: "Information ratio is active return divided by tracking error — skill per unit of active risk. High IR with tiny active risk may not move the needle; low IR with huge bets is how careers end.",
    example:
      "Active return +1.5%/year, tracking error 3% ⇒ IR = 0.5. Another manager: +3% active with 10% TE ⇒ IR = 0.3. The first is more efficient per unit risk; the second takes bigger swings that may dominate client outcomes.",
  },
  "Survivorship bias": {
    body: "Performance databases that drop failed funds inflate average returns. Always ask what is missing — dead strategies, delisted stocks, and quiet liquidations are where the optimistic mean went.",
    example:
      "Live hedge-fund database shows average +9%. Including funds that liquidated after −30% years pulls the true equal-weighted mean to +5%. Selecting only survivors overstates the opportunity set.",
  },
  "Capacity and market impact": {
    body: "A strategy’s edge can shrink as AUM grows because trading moves the price against you. Capacity is an economic constraint: some anomalies exist mainly at sizes too small to matter for large allocators.",
    example:
      "Signal earns +2% gross on $50m capacity. At $1b, average entry impact of 0.8% and exit impact of 0.8% erase most of the edge. The backtest at tiny size was real; scalable capacity was not.",
  },
  "Implementation shortfall": {
    body: "Implementation shortfall measures the gap between decision price and final execution, including delay, impact, and opportunity cost of unfilled size. Paper portfolios ignore it; live P&L does not.",
    example:
      "PM decides to buy at $100. Execution averages $100.60 and 20% of the order never fills before the move. Shortfall includes the 60¢ impact on filled shares plus the missed edge on the unfilled portion.",
  },
  "VWAP is not best execution": {
    body: "Matching VWAP can still be poor if you should not have traded that way, or if you signaled size. Benchmarks discipline desks; they do not define economic optimality for every order.",
    example:
      "Trader matches VWAP within 1 bp on a large sell — but by participating uniformly all day, they signaled size and pushed the afternoon price down. Beating VWAP is not the same as minimizing total shortfall.",
  },
  "Short selling mechanics": {
    body: "Shorting borrows shares, sells them, and later buys back to return. Stock borrow fees, recall risk, and squeeze dynamics mean short risk is not symmetric to long risk — tails and financing matter.",
    example:
      "Short at $50 with 10% annual borrow fee. Stock unchanged after a year ⇒ −10% from fees alone. If a squeeze gaps to $80, losses run without a hard cap the way a long’s loss is capped at −100%.",
  },
  "Margin and maintenance": {
    body: "Initial margin lets you lever; maintenance margin forces deleveraging when prices move against you. Forced liquidation can crystallize losses exactly when valuations look ‘cheap’ to someone with dry powder.",
    example:
      "Buy $100,000 stock with $50,000 margin (50%). Maintenance 30%. Price falls to $70,000; equity = $20,000 (≈28.6%) ⇒ margin call. Forced sale locks the loss even if price later rebounds to $90,000.",
  },
  "Central bank balance sheets": {
    body: "QE expands central-bank holdings of duration (and sometimes credit), injecting reserves and compressing term premia. QT reverses the flow. Portfolio rebalancing and signaling channels matter as much as textbook money-multiplier stories.",
    example:
      "Central bank buys $100b of long Treasuries. Sellers hold reserves instead of duration; term premium compresses and other investors rebalance into credit/equities. QT sales (or runoff) push the opposite portfolio effect.",
  },
  "Term premium": {
    body: "Long yields ≈ expected short rates + term premium. Term premium can be negative when safe long bonds are scarce or demanded as hedges. Reading every yield move as a pure growth/inflation forecast skips half the decomposition.",
    example:
      "10y yield 4.0%. Survey-expected average short rates over 10y = 4.5% ⇒ implied term premium ≈ −0.5%. Yields can rise because term premium normalizes even if expected path of policy is unchanged.",
  },
  "Negative rates mechanics": {
    body: "Negative policy rates flip the sign on depositing at the central bank and reshape money-market plumbing. Cash still has an effective floor near zero for retail, so transmission is uneven — and duration math still works with negative yields.",
    example:
      "Policy rate −0.5%. A 2y zero priced at negative yield can trade above par (e.g., price > 100) because locked-in negative carry is still better than worse alternatives for some constrained investors — price math, not a paradox.",
  },
  "Contango and backwardation": {
    body: "A futures curve in contango slopes up (deferred > nearby); backwardation slopes down. Long futures in contango tend to bleed roll yield; backwardation can add it. Spot narratives without curve context miss the return engine.",
    example:
      "Front oil $70, 12-month $77 (contango). Rolling a long each month through that curve bleeds toward the ~10% annualized slope (roughly), even if spot is unchanged — curve shape drove futures return.",
  },
  "Convenience yield": {
    body: "Convenience yield is the benefit of holding physical inventory (avoiding stockouts, optionality). High convenience yield helps explain backwardation — the curve embeds more than pure storage-cost accounting.",
    example:
      "Storage and financing argue for contango, but inventories are tight and spot trades at a premium to deferred futures (backwardation). The implied convenience yield is high: markets pay for access to physical barrels now.",
  },
  "Real estate cap rates": {
    body: "A cap rate is NOI divided by property value — roughly an earnings yield for real estate. Cap-rate compression looks like price appreciation; rising rates and risk premia can reverse it even if NOI is stable.",
    example:
      "NOI $5m, cap rate 5% ⇒ value $100m. Cap rates reprice to 6% with NOI unchanged ⇒ value ≈ $83.3m (−16.7%). Income stable; valuation multiple (cap rate) did the damage.",
  },
  "Infrastructure cash flows": {
    body: "Infrastructure assets often feature long-duration, contracted or regulated cash flows with inflation linkages — plus political, construction, and regulatory risks that do not show up in a simple bond analogy.",
    example:
      "Toll road with a 30y concession, CPI-linked tariffs, and leverage. A regulatory review that caps tariff growth 1% below CPI for a decade can cut equity IRR by hundreds of bp even if traffic counts hit plan.",
  },
  "Insurance-linked securities": {
    body: "Cat bonds transfer specified natural-catastrophe risk to capital markets. Returns are driven more by event risk than equity beta — until correlated disasters or modeling error remind you that ‘uncorrelated’ is a claim, not a guarantee.",
    example:
      "Cat bond spreads 5% over collateral yield for Florida hurricane risk. No triggering event ⇒ investors earn ~5% risk premium. A major hurricane that breaches the trigger can wipe most principal — binary event risk, not market beta.",
  },
  "Risk parity idea": {
    body: "Risk parity allocates so risk contributions (not capital weights) are balanced across assets, often leveraging lower-vol bonds. It can diversify risk — and can hurt when rates and risk assets sell off together.",
    example:
      "Unlevered 60/40 puts most risk in equities. Risk parity might hold larger bond notional so bond vol contribution ≈ equity vol contribution. In a 2022-style rates+equity selloff, both sleeves lose — balanced risk, joint drawdown.",
  },
  "Factor investing": {
    body: "Factors (value, momentum, quality, size, low vol) are systematic return drivers with economic stories and long drawdowns. Crowding, definition drift, and implementation costs decide whether the academic premium survives live trading.",
    example:
      "Value factor backtest +3%/year. After costs, crowding, and a definition that drifted toward cheap low-quality names, live value sleeve prints +0.5% for a decade with a multi-year −20% relative drawdown — premium ≠ smooth annuity.",
  },
  "Regime shifts": {
    body: "Return and correlation statistics are regime-dependent. Strategies optimized on one volatility/correlation regime can fail in another. The expensive assumption in a risk model is ‘this time looks like the sample.’",
    example:
      "Risk model estimated on 2010–2019 calm data. 2020 gap move prints 5σ under that covariance. Positions sized for the calm regime are suddenly oversized — the regime shift, not a single name, drove the blow-up.",
  },
  "Moral hazard in finance": {
    body: "When losses are shared with taxpayers or counterparties but gains are private, risk-taking expands. Prudential regulation, bail-in, and skin-in-the-game rules try to realign incentives — imperfectly, because crises rewrite rules in real time.",
    example:
      "Bank equity holders capture upside from leveraged risk; downside beyond equity is borne by creditors/taxpayers if resolution is incomplete. Expecting a backstop lowers the private cost of tail risk — classic moral hazard.",
  },
  "Netting and close-out": {
    body: "Master agreements allow close-out netting: on default, offset positive and negative contract values into one claim. That shrinks gross exposure dramatically — and makes legal enforceability of netting a systemic plumbing issue.",
    example:
      "You are +$30m on Swap A and −$25m on Swap B with the same counterparty. Without netting, gross credit exposure concerns both. With close-out netting, claim ≈ +$5m net — $25m of gross disappears legally.",
  },
  "Haircuts and procyclicality": {
    body: "Collateral haircuts rise when volatility rises, demanding more capital exactly when marks are stressed. That procyclicality turns trade-level prudence into system-wide deleveraging pressure.",
    example:
      "Haircut on corporate bonds 5% in calm markets, 15% in stress. A $100m portfolio that supported $95m financing suddenly supports $85m — forced $10m deleveraging into the same stress that widened haircuts.",
  },
  "LIBOR to SOFR transition": {
    body: "LIBOR was a panel-estimated interbank rate; SOFR is a transaction-based overnight Treasury repo rate. The transition rewired loan, derivative, and fallback conventions — a reminder that ‘the floating rate’ is an institutional construct.",
    example:
      "A loan paying LIBOR+150 bp migrates to SOFR + a spread adjustment (~10–25 bp historically for some tenors) + margin. Two ‘floating’ loans can differ by tens of bp purely from benchmark and fallback choices.",
  },
  "Duration gap banking": {
    body: "Banks often fund longer-duration assets with shorter-duration liabilities. That maturity transformation earns spread in calm markets and can devastate economic value when rates reprice liabilities faster than assets.",
    example:
      "Assets duration 5 years, liabilities duration 1 year, duration gap ≈ 4. Rates +200 bp ⇒ rough economic value of equity hit scales with gap × size. Deposit costs reprice quickly while fixed-rate assets lag — classic gap pain.",
  },
  "Liquidity coverage ratio idea": {
    body: "LCR-style rules require enough high-quality liquid assets to survive a modeled short stress outflow. They reduce run risk — and increase demand for the same safe assets everyone needs in a crisis.",
    example:
      "Modeled 30-day net outflows $10b ⇒ LCR needs ≥$10b HQLA if the ratio target is 100%. In system stress, many banks need the same HQLA at once — regulation reduces idiosyncratic run risk while concentrating demand for safe assets.",
  },
  "Mark-to-market vs mark-to-model": {
    body: "Level 1 marks use observable prices; deeper levels rely more on models and unverifiable inputs. In stress, the boundary between ‘price’ and ‘model’ becomes a governance and capital question, not just an accounting footnote.",
    example:
      "Liquid Treasury: Level 1 mark from screens. Complex tranche with no reliable print: Level 3 model mark. In a crisis, moving an asset from ‘model’ to a fire-sale comparable can gap capital overnight — classification mattered.",
  },
  "Adverse selection in markets": {
    body: "Liquidity providers lose to informed traders and widen spreads or pull quotes to compensate. When information asymmetry spikes, markets can gap not because nobody knows the price, but because nobody wants to be the bid.",
    example:
      "Ahead of a merger rumor, informed flow lifts the offer repeatedly. Market makers widen spreads from 2¢ to 20¢ or drop size. Observed ‘volatility’ is partly adverse-selection defense, not only news about cash flows.",
  },
};

function wikiLinks(entry) {
  const title = entry.wikiTitle || entry.topic;
  const links = [
    { label: "Wikipedia overview", url: WIKI(title) },
  ];
  // Add a second high-quality general reference where helpful
  const extras = {
    "Discounted cash flow": {
      label: "Damodaran on valuation (NYU)",
      url: "https://pages.stern.nyu.edu/~adamodar/",
    },
    "Efficient frontier": {
      label: "Mean–variance overview (Wikipedia)",
      url: WIKI("Modern portfolio theory"),
    },
    "Central clearing": {
      label: "BIS on CCPs",
      url: "https://www.bis.org/publ/qtrpdf/r_qt1512g.htm",
    },
    "LIBOR to SOFR transition": {
      label: "ARRC / SOFR",
      url: "https://www.newyorkfed.org/arrc",
    },
    "Central bank balance sheets": {
      label: "Fed balance sheet data",
      url: "https://www.federalreserve.gov/monetarypolicy/bst_recenttrends.htm",
    },
  };
  if (extras[entry.topic]) links.push(extras[entry.topic]);
  return links;
}

const facts = JSON.parse(await readFile(FACTS_PATH, "utf8"));
const out = facts.map((entry) => {
  const topic = entry.topic;
  const enrich = ENRICH[topic];
  if (!enrich) {
    throw new Error(`Missing enrichment for: ${topic}`);
  }
  const img = IMAGES[topic] || {};
  const next = {
    title: topic,
    topic,
    category: entry.category,
    body: enrich.body,
    example: enrich.example,
    links: wikiLinks(entry),
  };
  if (entry.wikiTitle) next.wikiTitle = entry.wikiTitle;
  if (img.imageUrl) {
    next.imageUrl = img.imageUrl;
    next.imageCredit = img.imageCredit;
  }
  return next;
});

const missing = Object.keys(ENRICH).filter((k) => !facts.some((f) => f.topic === k));
if (missing.length) console.warn("Unused enrich keys:", missing);

await writeFile(FACTS_PATH, `${JSON.stringify(out, null, 2)}\n`);
const withImg = out.filter((f) => f.imageUrl).length;
console.log(`Wrote ${out.length} facts (${withImg} with curated images) → ${FACTS_PATH}`);
