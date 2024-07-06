import { CSSProperties, useEffect, useRef, useState } from "react";

const padV = 10;
const padH = 10;
const height = 200;
const lineColor = "white";
const maxDiscretePointsAxisX = 100;
const maxDiscretePointsAxisY = 10;
const maxValue: number | undefined = undefined;
const minValue: number | undefined = undefined;
const styleAxisX: CSSProperties = { stroke: lineColor, strokeWidth: "2px" };
const styleAxisY: CSSProperties = { stroke: lineColor, strokeWidth: "2px" };

function round2dp(n: number) {
  return ((n * 100) | 0) / 100;
}

const calcFromseries1 = (
  arr: Price[],
  getter: (p: Price) => number,
  isMax: Boolean,
  seed?: number | undefined
): number | undefined => {
  let before = seed
    ? seed
    : isMax
    ? Number.MIN_SAFE_INTEGER
    : Number.MAX_SAFE_INTEGER;
  arr.forEach((i) => {
    const v = getter(i);
    if (isMax) {
      if (before < v) before = v;
    } else {
      if (before > v) before = v;
    }
  });
  return before == Number.MIN_SAFE_INTEGER || before == Number.MAX_SAFE_INTEGER
    ? undefined
    : before;
};

type Series = {
  dataset: Price[];
  getValue: (p: Price) => number;
  getValueStr: (p: Price) => string;
  getPosition: (p: Price) => number;
  getPositionStr: (p: Price) => string;
  lineStyle?: CSSProperties;
  label?: string;
};

type Price = {
  date: number;
  price: number;
};

function randomDataset() {
  // setup price / series1
  const prices: Price[] = [];
  let price = 50;
  for (let i = 0; i < 120; i++) {
    price = round2dp(price + (Math.random() * 10 - 5));
    prices.push({ date: 20240701 + i, price });
  }
  return prices;
}

const series1: Series = {
  dataset: randomDataset(),
  getValue: (p: Price): number => p.price,
  getValueStr: (p: Price): string => `${p.price}`,
  getPosition: (p: Price): number => p.date,
  getPositionStr: (p: Price): string => `${p.date}`,
  lineStyle: { stroke: "red", strokeWidth: "2px" },
  label: "tomato",
};

const series2: Series = {
  dataset: randomDataset(),
  getValue: (p: Price): number => p.price,
  getValueStr: (p: Price): string => `${p.price}`,
  getPosition: (p: Price): number => p.date,
  getPositionStr: (p: Price): string => `${p.date}`,
  lineStyle: { stroke: "green", strokeWidth: "2px" },
  label: "banana",
};

const series3: Series = {
  dataset: randomDataset(),
  getValue: (p: Price): number => p.price,
  getValueStr: (p: Price): string => `${p.price}`,
  getPosition: (p: Price): number => p.date,
  getPositionStr: (p: Price): string => `${p.date}`,
  lineStyle: { stroke: "blue", strokeWidth: "2px" },
  label: "apple",
};

const allSeries = [series1, series2, series3];

function LineChart() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    ref.current?.clientWidth && setWidth(ref.current?.clientWidth);
  }, []);

  const left = padH;
  const right = width - padH;
  const w = right - left;
  const top = padV;
  const bottom = height - padV;
  const h = bottom - top;

  function calcLayout(series: Series[]) {
    let maxV = maxValue;
    let minV = minValue;
    let discretePointsAxisX = maxDiscretePointsAxisX;
    series.forEach((s) => {
      maxV = maxValue || calcFromseries1(s.dataset, s.getValue, true, maxV);
      minV = minValue || calcFromseries1(s.dataset, s.getValue, false, minV);
      discretePointsAxisX = Math.min(s.dataset.length, discretePointsAxisX);
    });
    const deltaX = discretePointsAxisX ? w / (discretePointsAxisX - 1) : 0;
    const deltaV = maxV && minV ? maxV - minV : undefined;
    const deltaY = deltaV ? h / maxDiscretePointsAxisY : undefined;

    return { minV, maxV, discretePointsAxisX, deltaX, deltaV, deltaY };
  }

  const { minV, maxV, discretePointsAxisX, deltaX, deltaV, deltaY } =
    calcLayout(allSeries);

  console.log({
    width,
    discretePointsAxisX,
    deltaX,
    maxV,
    minV,
    deltaV,
    deltaY,
  });

  const charts =
    width && deltaX && deltaY && deltaV && minV
      ? allSeries.map((ser) => {
          const ds = ser.dataset;
          const plots = Array.from(Array(discretePointsAxisX)).map((_, i) => {
            const idx =
              discretePointsAxisX === ds.length
                ? i
                : ((ds.length / discretePointsAxisX) * i) | 0;
            const p = ds[idx];
            const pos = ser.getPosition(p);
            const value = ser.getValue(p);
            const r = {
              x: left + idx * deltaX,
              y: bottom - ((value - minV) / deltaV) * h,
            };
            return r;
          });
          return { series: ser, plots };
        })
      : undefined;

  return (
    <div ref={ref}>
      {charts && charts.length ? (
        <svg width={`${width}px`} height={`${height}px`}>
          <rect x={0} y={0} width={"100%"} height={"100%"} fill="black" />
          <line
            x1={left - 1}
            y1={top + 1}
            x2={left - 1}
            y2={bottom + 1}
            style={styleAxisY}
          ></line>
          <line
            x1={left - 1}
            y1={bottom + 1}
            x2={right}
            y2={bottom + 1}
            style={styleAxisX}
          ></line>
          {charts.map((ch) => {
            return ch.plots.map((a, idx, plots) => {
              return idx < plots.length - 1 ? (
                <line
                  key={`lx_${idx}`}
                  x1={a.x}
                  y1={a.y}
                  x2={plots[idx + 1].x}
                  y2={plots[idx + 1].y}
                  style={ch.series.lineStyle}
                ></line>
              ) : null;
            });
          })}
        </svg>
      ) : null}
    </div>
  );
}

export default LineChart;
