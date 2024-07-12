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
  showTextEvery?: 0 | 1 | 2 | 3 | 4 | 5,
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
    fontSize: "12px"
  },
  showTextEvery: 0,
  grid: true,
  gridStyle: { stroke: "#303030", strokeWidth: "2px" },
  formatValue: (n: number) => round2dp(n).toString(),
};

const axisY: Axis = {
  maxDiscretePoints: 10,
  style: { stroke: "#808080", strokeWidth: "2px" },
  textStyle: {
    color: "white",
    fontSize: "12px"
  },
  showTextEvery: 2,
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

type EnrichedSeries = Series & { enrichedDataset: Series["dataset"]};
  

type Price = {
  date: number;
  price: number;
};

function dateToNumber(date: Date) {
  return date.getDate() + (date.getMonth() + 1) * 100 + date.getFullYear() * 10000;
}

function randomenrichedDataset(startDt: number, inc: number) {
  // setup price / series1
  const prices: Price[] = [];
  let price = 50;
  const yr = (startDt / 10000) | 0;
  const month = ((startDt % 10000) / 100) | 0;
  const day = startDt % 100;
  const date = new Date(yr, month - 1, day);
  for (let i = 0; i < 50; i++) {
    price = round2dp(price + (Math.random() * 10 - 5));
    prices.push({ date: dateToNumber(date), price });
    date.setDate(date.getDate() + inc);
  }
  return prices;
}

const series1: Series = {
  dataset: randomenrichedDataset(20240701, 1),
  getValue: (p: Price): number => p.price,
  getValueStr: (p: Price): string => `${p.price}`,
  getPosition: (p: Price): number => p.date,
  getPositionStr: (p: Price): string => `${p.date}`,
  lineStyle: { stroke: "red", strokeWidth: "3px" },
  label: "tomato",
};

const series2: Series = {
  dataset: randomenrichedDataset(20240601, 3),
  getValue: (p: Price): number => p.price,
  getValueStr: (p: Price): string => `${p.price}`,
  getPosition: (p: Price): number => p.date,
  getPositionStr: (p: Price): string => `${p.date}`,
  lineStyle: { stroke: "green", strokeWidth: "3px" },
  label: "banana",
};

const series3: Series = {
  dataset: randomenrichedDataset(20240501, 2),
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

  function calcLayout(series: EnrichedSeries[]) {
    let maxV = maxValue;
    let minV = minValue;
    let discretePointsAxisX = axisX.maxDiscretePoints || maxDiscretePointsAxisX;
    series.forEach((s) => {
      maxV = maxValue || calcFromseries1(s.enrichedDataset, s.getValue, true, maxV);
      minV = minValue || calcFromseries1(s.enrichedDataset, s.getValue, false, minV);
      discretePointsAxisX = Math.min(s.enrichedDataset.length, discretePointsAxisX);
    });

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

  function normalize(allSeries: Series[]): EnrichedSeries[] {
    const ds = allSeries.map(s => s.dataset.slice());
    const result: EnrichedSeries[] = allSeries.map(s => ({ ...s, enrichedDataset: [] }));
    const dateMap = new Map<number, number>();
    ds.forEach(d => d.forEach(p => dateMap.set(p.date, 1)));
    const dates = Array.from(dateMap.keys()).sort();

    ds.forEach((ser, idx) => {
      dates.forEach((dt) => {
        let loop = 0;
        while(loop++ < 1000) {
          let pop = ser.length ? ser[0] : undefined;
          if (pop) {
            if (pop.date === dt) {
              result[idx].enrichedDataset.push(pop);
              ser.shift();
              break;
            } else if (pop.date < dt) {
              result[idx].enrichedDataset.push(pop);
              ser.shift();
            } else {
              const clone = { ...pop, date: dt };
              result[idx].enrichedDataset.push(clone);
              break;
            }
          } else if (result[idx].enrichedDataset.length) {
            let clone = result[idx].enrichedDataset[result[idx].enrichedDataset.length - 1];
            clone = { ...clone, date: dt };
            result[idx].enrichedDataset.push(clone);
            break
          } else break;
        }
      })
    });

    return result;
  }

  const normalizedSeries = normalize(allSeries);

  const {
    minV,
    maxV,
    discretePointsAxisX,
    discretePointsAxisY,
    discreteGapX,
    discreteGapY,
    deltaV,
  } = calcLayout(normalizedSeries);

  /*
  console.log({
    width,
    discretePointsAxisX,
    discreteGapX,
    discreteGapY,
    maxV,
    minV,
    deltaV,
  });
  */

  const charts =
    width && discreteGapX && deltaV && minV
      ? normalizedSeries.map((ser) => {
          const ds = ser.enrichedDataset;
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

  console.log({ charts: charts});

  const shouldRender = charts && charts.length;
  
  const svgAxisBackY =
    shouldRender && deltaV ? (
      <>
        {Array.from(Array(discretePointsAxisY + 1)).map((_, i) => {
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
        {Array.from(Array(discretePointsAxisY + 1)).map((_, i) => {
          const gap = deltaV / discretePointsAxisY;
          const pointY = (((gap * i) / deltaV) * h) | 0;
          const text = axisY.showTextEvery && i % axisY.showTextEvery == 0 ? (
            <text
              key={`axisY_txt${i}`}
              x={left + 5}
              y={bottom - pointY + 2}
              fontSize={axisY.textStyle?.fontSize || "unset"}
              fill={axisY.textStyle?.color || "unset"}
              fontWeight={axisY.textStyle?.fontWeight || "unset"}
            >
              {axisY.formatValue(minV! + gap * i)}
            </text>
          ) : null;
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
          x1={left}
          y1={top}
          x2={left}
          y2={bottom}
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
        x1={left}
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
              /*
              if (idx < plots.length - 1) {
                console.log({
                  x1: a.x,
                  y1: a.y,
                  x2: plots[idx + 1].x,
                  y2: plots[idx + 1].y,
                });
              }
              */  
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
