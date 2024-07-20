import { CSSProperties, useEffect, useRef, useState } from "react";

const maxDiscretePointsAxisX = 255;
const maxDiscretePointsAxisY = 255;

/**
 * Simple data point denoted by id, at X with value Y.
 */
export type DataPoint = {
  id?: string;
  x: number;
  y: number;
};

/**
 * Represent a dataset with an id and label
 */
export type Series<P extends DataPoint = DataPoint> = {
  id: string;
  dataset: P[];
  lineStyle?: CSSProperties;
  label?: string;
};

export type DiscreteLines = {
  /** A value along axis X or Y */
  value: number;

  /** CSS style of the line */
  lineStyle?: CSSProperties;
};

/**
 * Represent X or Y axis
 */
export type Axis = {
  /** CSS style for the horizontal or vertical line representing this axis */
  style?: CSSProperties;

  /** Ideal number of marking texts along the axis */
  markings?: number;

  /** Adjuster of X of the location where marking is displayed on the axis */
  markingPosX?: number;

  /** Adjuster of Y of the location where marking is displayed on the axis */
  markingPosY?: number;

  /** Text-anchor  */
  markingPosXPosition?: "start" | "middle" | "end";

  /** Dominant-baseline */
  markingPosYPosition?:
    | "middle"
    | "auto"
    | "hanging"
    | "text-bottom"
    | "text-top"
    | "central";

  /** CSS style of marking text */
  markingTextStyle?: CSSProperties;

  /** Ideal number of dicrete minor markings (without text) along the axis */
  maxDiscretePoints?: number;

  discreteLines?: DiscreteLines[];

  /** Whther or not to show horizontal or vertical line perpendicular to this axis at each discrete point */
  grid?: boolean;

  /** CSS style for the grid */
  gridStyle?: CSSProperties;

  /** Formatter of x or y value of DataPoint corresponding to this axis */
  formatValue: (n: number) => string;
};

/**
 * Callback when a DataPoint is selected on the chart
 */
export type OnDataPointSelected<P extends DataPoint = DataPoint> = (
  seriesId: string,
  price: P
) => void;

/**
 * Props to LineChart
 */
export type LayoutProps<P extends DataPoint = DataPoint> = {
  /** The width of the chart including margin */
  width?: number;

  /** The height of the chart including margin */
  height?: number;

  /** Space between upper bound and the chart */
  marginTop?: number;

  /** Space between lower bound and the chart */
  marginBottom?: number;

  /** Space between left bound and the chart */
  marginLeft?: number;

  /** Space between righgt bound and the chart */
  marginRight?: number;

  /** Max value on axis Y */
  maxValue?: number;

  /** Min value on axis Y */
  minValue?: number;

  /** % added to max value in axis Y to avoid hitting ceiling */
  maxValueExtraPct?: number;

  /** % added to max value in axis Y to avoid hitting bottom */
  minValueExtraPct?: number;

  axisX: Axis;
  axisY: Axis;
  allSeries: Series<P>[];

  showHint?: Boolean;
  hintTextHeight?: number;
  hintTextStyle?: CSSProperties;

  /** Callback when DataPoint selected */
  onDataPointSelected?: OnDataPointSelected<P>;
};

function calcMinMax<P extends DataPoint>(
  arr: P[],
  isMax: Boolean,
  seed?: number | undefined
): number | undefined {
  let before = seed
    ? seed
    : isMax
    ? Number.MIN_SAFE_INTEGER
    : Number.MAX_SAFE_INTEGER;
  arr.forEach((i) => {
    const v = i.y;
    if (isMax) {
      if (before < v) before = v;
    } else {
      if (before > v) before = v;
    }
  });
  return before === Number.MIN_SAFE_INTEGER ||
    before === Number.MAX_SAFE_INTEGER
    ? undefined
    : before;
}

/** Internal */
type EnrichedSeries<P extends DataPoint> = Series<P> & {
  normalizedDataset: Series<P>["dataset"];
};

/** Internal */
type Plot<P extends DataPoint> = {
  x: number;
  y: number;
  price: P;
  idx: number;
};

/** Internal */
type Hint<P extends DataPoint> = {
  ds: EnrichedSeries<P>;
  plot: Plot<P>;
};

/**
 * Internal - Normalize series to have the same length of datasets that share the
 * same population of X axis.
 */
function normalize<P extends DataPoint>(
  allSeries: Series<P>[]
): EnrichedSeries<P>[] {
  const ds = allSeries.map((s) => s.dataset.slice());
  const result: EnrichedSeries<P>[] = allSeries.map((s) => ({
    ...s,
    normalizedDataset: [],
  }));
  const uniqueXes = new Map<number, number>();
  ds.forEach((d) => d.forEach((p) => uniqueXes.set(p.x, 1)));
  const xes = Array.from(uniqueXes.keys()).sort();

  ds.forEach((ser, idx) => {
    xes.forEach((x) => {
      let loop = 0;
      while (loop++ < 1000) {
        let pop = ser.length ? ser[0] : undefined;
        if (pop) {
          if (pop.x === x) {
            result[idx].normalizedDataset.push(pop);
            ser.shift();
            break;
          } else if (pop.x < x) {
            result[idx].normalizedDataset.push(pop);
            ser.shift();
          } else {
            const clone = { ...pop, x };
            result[idx].normalizedDataset.push(clone);
            break;
          }
        } else if (result[idx].normalizedDataset.length) {
          let clone =
            result[idx].normalizedDataset[
              result[idx].normalizedDataset.length - 1
            ];
          clone = { ...clone, x };
          result[idx].normalizedDataset.push(clone);
          break;
        } else break;
      }
    });
  });

  return result;
}

/**
 * Internal - Calculate layout information used to draw the chart
 */
function calcLayout<P extends DataPoint>(
  series: EnrichedSeries<P>[],
  props: LayoutProps<P>,
  chartWidth: number,
  chartHeight: number
) {
  let maxV: undefined | number = props.maxValue;
  let minV: undefined | number = props.minValue;
  let discretePointsAxisX =
    props.axisX.maxDiscretePoints || maxDiscretePointsAxisX;
  series.forEach((s) => {
    maxV = calcMinMax(s.normalizedDataset, true, maxV);
    minV = calcMinMax(s.normalizedDataset, false, minV);
    discretePointsAxisX = Math.min(
      s.normalizedDataset.length,
      discretePointsAxisX
    );
  });

  let deltaV = maxV && minV ? maxV - minV : undefined;

  minV =
    deltaV && props.minValueExtraPct
      ? minV! - (props.minValueExtraPct / 100) * deltaV
      : minV;
  maxV =
    deltaV && props.maxValueExtraPct
      ? maxV! + (props.maxValueExtraPct / 100) * deltaV
      : maxV;

  deltaV = maxV && minV ? maxV - minV : undefined;
  // pixels between descrete points in X axis
  const discreteGapX = discretePointsAxisX
    ? chartWidth / (discretePointsAxisX - 1)
    : 0;
  const discretePointsAxisY =
    props.axisY.maxDiscretePoints || maxDiscretePointsAxisY;
  const discreteGapY = deltaV ? chartHeight / discretePointsAxisY : undefined;

  return {
    minV, maxV, discretePointsAxisX, discretePointsAxisY, discreteGapX, discreteGapY, deltaV,
  };
}

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Create LineChart component
 * @param props
 * @returns
 */
const LineChart = (props: LayoutProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(props.width || 100);

  useEffect(() => {
    if (!props.width || props.width < 1) {
      ref.current?.clientWidth && setWidth(ref.current?.clientWidth);
    }
  }, []);

  const [hint, setHint] = useState<Hint<DataPoint> | undefined>(undefined);
  const left = props.marginLeft || 10;
  const right = width - (props.marginRight || 10);
  const w = right - left;
  const top = props.marginTop || 10;
  const height = props.height || 100;
  const bottom = height - (props.marginBottom  || 10);
  const h = bottom - top;
  const normalizedSeries = normalize(props.allSeries);
  const hintTextHeight = props.hintTextHeight || 15;

  const {
    minV,
    maxV,
    discretePointsAxisX,
    discretePointsAxisY,
    discreteGapX,
    discreteGapY,
    deltaV,
  } = calcLayout(normalizedSeries, props, w, h);

  const charts =
    width && discreteGapX && deltaV && minV
      ? normalizedSeries.map((ser) => {
          const ds = ser.normalizedDataset;
          const plots = Array.from(Array(discretePointsAxisX)).map((_, i) => {
            const idx =
              discretePointsAxisX === ds.length
                ? i
                : Math.round((ds.length / discretePointsAxisX) * i);
            const p = ds[idx];
            const pos = p.x;
            const value = p.y;
            const r: Plot<DataPoint> = {
              x: Math.round(left + i * discreteGapX),
              y: Math.round(bottom - ((value - minV) / deltaV) * h),
              price: p,
              idx,
            };
            return r;
          });
          return { series: ser, plots };
        })
      : undefined;

  const shouldRender = charts && charts.length;

  const svgAxisBackY =
    shouldRender && deltaV ? (
      <>
        {Array.from(Array(discretePointsAxisY + 1)).map((_, i) => {
          const gap = deltaV / discretePointsAxisY;
          const pointY = Math.round(((gap * i) / deltaV) * h);
          return (
            <>
              {props.axisY.grid ? (
                <line
                  key={`axisY_grid${i}`}
                  x1={left} y1={bottom - pointY} x2={right} y2={bottom - pointY}
                  style={
                    props.axisY.gridStyle || {
                      ...props.axisY.style,
                      filter: "opacity(20%)",
                    }
                  }
                />
              ) : null}
            </>
          );
        })}
        {props.axisY.discreteLines ? (
          <>
            {props.axisY.discreteLines.map((l, i) => {
              const y = Math.round(bottom - ((l.value - minV!!) / deltaV) * h);
              return (
                <line
                  key={`discreteY_pt${i}`}
                  x1={left} y1={y} x2={right} y2={y} style={l.lineStyle || {}}
                />
              );
            })}
          </>
        ) : null}
      </>
    ) : null;

  const markingDivisorAxisY =
    props.axisY.markings && props.axisY.markings > 2
      ? Math.round(discretePointsAxisY / (props.axisY.markings - 1))
      : undefined;
  const svgAxisFrontY =
    shouldRender && deltaV ? (
      <>
        {Array.from(Array(discretePointsAxisY + 1)).map((_, i) => {
          const gap = deltaV / discretePointsAxisY;
          const pointY = Math.round(((gap * i) / deltaV) * h);
          const showMarking =
            i === 0 ||
            i === discretePointsAxisY || // first and last
            (markingDivisorAxisY && i % markingDivisorAxisY === 0);

          const text = showMarking ? (
            <text
              key={`axisY_txt${i}`}
              textAnchor={props.axisY.markingPosXPosition || "middle"}
              dominantBaseline={props.axisY.markingPosYPosition || "middle"}
              x={left + (props.axisY.markingPosX || 0)}
              y={bottom - pointY + (props.axisY.markingPosY || 0)}
              style={props.axisY.markingTextStyle || {}}
            >
              {props.axisY.formatValue(minV! + gap * i)}
            </text>
          ) : null;
          return (
            <>
              <line
                key={`axisY_pt${i}`}
                x1={left - 3} y1={bottom - pointY} x2={left} y2={bottom - pointY}
                style={props.axisY.style || {}}
              />
              {text}
            </>
          );
        })}
        <line
          key="axisY" x1={left} y1={top} x2={left} y2={bottom} 
          style={props.axisY.style || {}}
        />
      </>
    ) : null;

  const svgAxisBackX = shouldRender ? (
    <>
      {Array.from(Array(discretePointsAxisX)).map((_, idx) => {
        const pointX = Math.round(left + idx * discreteGapX);
        // vertical lines
        return props.axisX.grid ? (
          <line
            key={`axisX_pt${idx}`}
            x1={pointX} y1={bottom} x2={pointX} y2={top}
            style={
              props.axisX.gridStyle || {
                ...props.axisX.style,
                filter: "opacity(20%)",
              }
            }
          />
        ) : null;
      })}
    </>
  ) : null;

  const markingDivisorAxisX =
    props.axisX.markings && props.axisX.markings > 2
      ? Math.round(discretePointsAxisX / (props.axisX.markings - 1))
      : undefined;
  const svgAxisFrontX = shouldRender ? (
    <>
      {Array.from(Array(discretePointsAxisX)).map((_, i) => {
        const pointX = Math.round(left + i * discreteGapX);
        const showMarking =
          i === 0 ||
          i === discretePointsAxisX - 1 || // first and last
          (markingDivisorAxisX && i % markingDivisorAxisX === 0);

        const text = showMarking ? (
          <text
            key={`axisX_txt${i}`}
            textAnchor={props.axisX.markingPosXPosition || "middle"}
            dominantBaseline={props.axisX.markingPosYPosition || "middle"}
            x={pointX + (props.axisX.markingPosX || 0)}
            y={bottom + (props.axisX.markingPosY || 0)}
            style={props.axisX.markingTextStyle || {}}
          >
            {charts ? props.axisX.formatValue(charts[0].plots[i].price.x) : "X"}
          </text>
        ) : null;

        return (
          <>
            <line
              key={`axisX_pt${i}`}
              x1={pointX} y1={bottom} x2={pointX} y2={bottom + 3}
              style={props.axisX.style || {}}
            />
            {text}
          </>
        );
      })}
      <line
        key="axisX"
        x1={left} y1={bottom} x2={right} y2={bottom}
        style={props.axisX.style || {}}
      />
    </>
  ) : null;

  const handlePlot = <P extends DataPoint>(
    ds: EnrichedSeries<P>,
    plot: Plot<P>,
    mouseEvent: Boolean
  ) => {
    const touchDevice = isTouchDevice();
    if ((touchDevice && mouseEvent) || (!touchDevice && !mouseEvent)) return 1;

    if (props.showHint == undefined || props.showHint) {
      setHint((h) => (h?.plot == plot ? undefined : { ds, plot }));
    }
    props.onDataPointSelected && props.onDataPointSelected(ds.id, plot.price);
    return 1;
  };

  const svgHint = hint ? (
    <>
      <circle
        key={`hint_circle`}
        cx={hint.plot.x} cy={hint.plot.y} r={5}
        stroke={hint.ds.lineStyle?.stroke || "white"}
        strokeWidth={1} fill="white"
        onTouchEnd={(e) => handlePlot(hint.ds, hint.plot, false)}
        onClick={(e) => handlePlot(hint.ds, hint.plot, true)}
      />
      <text
        key="hint_text1"
        textAnchor={
          hint.plot.x < width / 8
            ? "start"
            : hint.plot.x > (width * 7) / 8
            ? "end"
            : "middle"
        }
        dominantBaseline="middle"
        x={hint.plot.x}
        y={
          hint.plot.y +
          (hint.plot.y > height / 2
            ? hintTextHeight * -3 : hintTextHeight)
        }
        style={props.hintTextStyle || {}}
      >
        {`${hint.ds.label || ""}`}
      </text>
      <text
        key="hint_text2"
        textAnchor={
          hint.plot.x < width / 8
            ? "start"
            : hint.plot.x > (width * 7) / 8
            ? "end"
            : "middle"
        }
        dominantBaseline="middle"
        x={hint.plot.x}
        y={
          hint.plot.y +
          (hint.plot.y > height / 2
            ? -2 * hintTextHeight : 2 * hintTextHeight)
        }
        style={props.hintTextStyle || {}}
      >
        {props.axisY.formatValue(hint.plot.price.y)}
      </text>
      <text
        key="hint_text3"
        textAnchor={
          hint.plot.x < width / 8
            ? "start"
            : hint.plot.x > (width * 7) / 8
            ? "end"
            : "middle"
        }
        dominantBaseline="middle"
        x={hint.plot.x}
        y={
          hint.plot.y +
          (hint.plot.y > height / 2
            ? -hintTextHeight : hintTextHeight * 3)
        }
        style={props.hintTextStyle || {}}
      >
        {props.axisX.formatValue(hint.plot.price.x)}{" "}
      </text>
    </>
  ) : null;

  const svgLineCharts = charts ? (
    <>
      {" "}
      {charts.map((ch, chIdx) => {
        return ch.plots.map((plot, idx) => {
          const dotStroke = ch.series.lineStyle?.stroke || "white";
          return idx < ch.plots.length - 1 ? (
            <>
              <line
                key={`lx_${chIdx}_${idx}`}
                x1={plot.x} y1={plot.y}
                x2={ch.plots[idx + 1].x}
                y2={ch.plots[idx + 1].y}
                style={ch.series.lineStyle}
              />
              <circle
                key={`plot_${chIdx}_${plot.x}_${plot.y}`}
                cx={plot.x} cy={plot.y} r={3} stroke={dotStroke}
                strokeWidth={2} fill="black"
                onTouchEnd={(e) =>
                  handlePlot(charts[chIdx].series, plot, false)
                }
                onClick={(e) => handlePlot(charts[chIdx].series, plot, true)}
              />
              {idx == ch.plots.length - 2 ? (
                <circle
                  key={`plot_${chIdx}_last`}
                  cx={ch.plots[idx + 1].x} cy={ch.plots[idx + 1].y}
                  r={3} stroke={dotStroke} strokeWidth={2} fill="black"
                  onTouchEnd={(e) =>
                    handlePlot(charts[chIdx].series, ch.plots[idx + 1], false)
                  }
                  onClick={(e) =>
                    handlePlot(charts[chIdx].series, ch.plots[idx + 1], true)
                  }
                />
              ) : null}
            </>
          ) : null;
        });
      })}
    </>
  ) : null;

  return (
    <div ref={ref}>
      {shouldRender ? (
        <svg width={`${width}px`} height={`${props.height}px`}>
          <rect x={0} y={0} width={"100%"} height={"100%"} fill="black" />
          {svgAxisBackX}
          {svgAxisBackY}
          {svgLineCharts}
          {svgAxisFrontY}
          {svgAxisFrontX}
          {svgHint}
        </svg>
      ) : null}
    </div>
  );
};

export default LineChart;
