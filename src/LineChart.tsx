import { CSSProperties, useEffect, useRef, useState } from "react";

const padV = 10;
const padH = 10;
const height = 200;
const maxDiscretePointsAxisX = 100;
const maxDiscretePointsAxisY = 10;
const maxValue: number | undefined = undefined;
const minValue: number | undefined = undefined;

// % added to max value in axis Y to avoid hitting ceiling
const maxValueExtraPct: number | undefined = 10.0;

// % added to max value in axis Y to avoid hitting bottom
const minValueExtraPct: number | undefined = 10.0;

type Axis = {
  style?: CSSProperties;
  textStyle?: CSSProperties;
  maxDiscretePoints?: number;
  grid?: boolean;
  gridStyle?: CSSProperties;
  formatValue: (n: number) => string;
};

const axisX: Axis = {
  maxDiscretePoints: 25,
  style: { stroke: "#808080", strokeWidth: "2px" },
  textStyle: {
    color: "white",
    fontSize: "10px"
  },
  grid: true,
  gridStyle: { stroke: "#303030", strokeWidth: "2px" },
  formatValue: (n: number) => round2dp(n).toString(),
};

const axisY: Axis = {
  maxDiscretePoints: 10,
  style: { stroke: "#808080", strokeWidth: "2px" },
  textStyle: {
    color: "white",
    fontSize: "10px"
  },
  grid: true,
  gridStyle: { stroke: "#303030", strokeWidth: "2px" },
  formatValue: (n: number) => round2dp(n).toString(),
};

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
  for (let i = 0; i < 50; i++) {
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
  lineStyle: { stroke: "red", strokeWidth: "3px" },
  label: "tomato",
};

const series2: Series = {
  dataset: randomDataset(),
  getValue: (p: Price): number => p.price,
  getValueStr: (p: Price): string => `${p.price}`,
  getPosition: (p: Price): number => p.date,
  getPositionStr: (p: Price): string => `${p.date}`,
  lineStyle: { stroke: "green", strokeWidth: "3px" },
  label: "banana",
};

const series3: Series = {
  dataset: randomDataset(),
  getValue: (p: Price): number => p.price,
  getValueStr: (p: Price): string => `${p.price}`,
  getPosition: (p: Price): number => p.date,
  getPositionStr: (p: Price): string => `${p.date}`,
  lineStyle: { stroke: "blue", strokeWidth: "3px" },
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
    let discretePointsAxisX = axisX.maxDiscretePoints || maxDiscretePointsAxisX;
    series.forEach((s) => {
      maxV = maxValue || calcFromseries1(s.dataset, s.getValue, true, maxV);
      minV = minValue || calcFromseries1(s.dataset, s.getValue, false, minV);
      discretePointsAxisX = Math.min(s.dataset.length, discretePointsAxisX);
    });

    console.log({ minV, maxV });

    let deltaV = maxV && minV ? maxV - minV : undefined;

    minV =
      deltaV && minValueExtraPct
        ? minV! - (minValueExtraPct / 100) * deltaV
        : minV;
    maxV =
      deltaV && maxValueExtraPct
        ? maxV! + (maxValueExtraPct / 100) * deltaV
        : maxV;

    deltaV = maxV && minV ? maxV - minV : undefined;
    // pixels between descrete points in X axis
    const discreteGapX = discretePointsAxisX
      ? w / (discretePointsAxisX - 1)
      : 0;
    const discretePointsAxisY =
      axisY.maxDiscretePoints || maxDiscretePointsAxisY;
    const discreteGapY = deltaV ? h / discretePointsAxisY : undefined;

    return {
      minV,
      maxV,
      discretePointsAxisX,
      discretePointsAxisY,
      discreteGapX,
      discreteGapY,
      deltaV,
    };
  }

  const {
    minV,
    maxV,
    discretePointsAxisX,
    discretePointsAxisY,
    discreteGapX,
    discreteGapY,
    deltaV,
  } = calcLayout(allSeries);

  console.log({
    width,
    discretePointsAxisX,
    discreteGapX,
    discreteGapY,
    maxV,
    minV,
    deltaV,
  });

  const charts =
    width && discreteGapX && deltaV && minV
      ? allSeries.map((ser) => {
          const ds = ser.dataset;
          const plots = Array.from(Array(discretePointsAxisX)).map((_, i) => {
            const idx =
              discretePointsAxisX === ds.length
                ? i
                : ((ds.length / discretePointsAxisX) * i) | 0;
            const p = ds[idx];
            const pos = ser.getPosition(p); // TODO: not used
            const value = ser.getValue(p);
            const r = {
              x: (left + i * discreteGapX) | 0,
              y: (bottom - ((value - minV) / deltaV) * h) | 0,
              pos,
              value,
              idx,
            };
            return r;
          });
          return { series: ser, plots };
        })
      : undefined;

  console.log(charts);

  const shouldRender = charts && charts.length;
  
  const svgAxisBackY =
    shouldRender && deltaV ? (
      <>
        {Array.from(Array(discretePointsAxisY)).map((_, i) => {
          const gap = deltaV / discretePointsAxisY;
          const pointY = (((gap * i) / deltaV) * h) | 0;
          return (
            <>
              {axisY.grid ? (
                <line
                  key={`axisY_grid${i}`}
                  x1={left}
                  y1={bottom - pointY}
                  x2={right}
                  y2={bottom - pointY}
                  style={
                    axisY.gridStyle || {
                      ...axisY.style,
                      filter: "opacity(20%)",
                    }
                  }
                ></line>
              ) : null}
            </>
          );
        })}
      </>
    ) : null;

  const svgAxisFrontY =
    shouldRender && deltaV ? (
      <>
        {Array.from(Array(discretePointsAxisY)).map((_, i) => {
          const gap = deltaV / discretePointsAxisY;
          const pointY = (((gap * i) / deltaV) * h) | 0;
          const text = (
            <text
              key={`axisY_txt${i}`}
              x={left + 10}
              y={bottom - pointY + 2}
              fontSize={axisY.textStyle?.fontSize || "unset"}
              fill={axisY.textStyle?.color || "unset"}
              fontWeight={axisY.textStyle?.fontWeight || "unset"}
            >
              {axisY.formatValue(minV! + gap * i)}
            </text>
          );
          return (
            <>
              <line
                key={`axisY_pt${i}`}
                x1={left - 3}
                y1={bottom - pointY}
                x2={left + 3}
                y2={bottom - pointY}
                style={axisY.style || {}}
              ></line>
              {text}
            </>
          );
        })}
        <line
          key="axisY"
          x1={left - 1}
          y1={top + 1}
          x2={left - 1}
          y2={bottom + 1}
          style={axisY.style || {}}
        ></line>
      </>
    ) : null;

  const svgAxisBackX = shouldRender ? (
    <>
      {Array.from(Array(discretePointsAxisX)).map((_, idx) => {
        const pointX = (left + idx * discreteGapX) | 0;
        // vertical lines
        return axisX.grid ? (
          <line
            key={`axisX_pt${idx}`}
            x1={pointX}
            y1={bottom}
            x2={pointX}
            y2={top}
            style={
              axisX.gridStyle || { ...axisX.style, filter: "opacity(20%)" }
            }
          ></line>
        ) : null;
      })}
    </>
  ) : null;

  const svgAxisFrontX = shouldRender ? (
    <>
      {Array.from(Array(discretePointsAxisX)).map((_, idx) => {
        const pointX = (left + idx * discreteGapX) | 0;
        return <line
          key={`axisX_pt${idx}`}
          x1={pointX}
          y1={bottom - 3}
          x2={pointX}
          y2={bottom + 3}
          style={axisX.style || {}}
        ></line>
      })}
      <line
        key="axisX"
        x1={left - 1}
        y1={bottom}
        x2={right}
        y2={bottom}
        style={axisX.style || {}}
      ></line>
    </>
  ) : null;

  return (
    <div ref={ref}>
      {shouldRender ? (
        <svg width={`${width}px`} height={`${height}px`}>
          <rect x={0} y={0} width={"100%"} height={"100%"} fill="black" />
          {svgAxisBackX}
          {svgAxisBackY}
          {charts.map((ch, chIdx) => {
            return ch.plots.map((a, idx, plots) => {
              if (idx < plots.length - 1) {
                console.log({
                  x1: a.x,
                  y1: a.y,
                  x2: plots[idx + 1].x,
                  y2: plots[idx + 1].y,
                });
              }
              return idx < plots.length - 1 ? (
                <line
                  key={`lx_${chIdx}_${idx}`}
                  x1={a.x}
                  y1={a.y}
                  x2={plots[idx + 1].x}
                  y2={plots[idx + 1].y}
                  style={ch.series.lineStyle}
                ></line>
              ) : null;
            });
          })}
          {svgAxisFrontX}
          {svgAxisFrontY}
        </svg>
      ) : null}
    </div>
  );
}

export default LineChart;
