import { CSSProperties, useEffect, useRef, useState } from "react";

const maxDiscretePointsAxisX = 100;
const maxDiscretePointsAxisY = 10;

export type Price = {
  x: number;
  y: number;
};

export type Series<P extends Price = Price> = {
  id: string,
  dataset: P[];
  lineStyle?: CSSProperties;
  label?: string;
};

export type Axis = {
  style?: CSSProperties;
  markings?: number;
  markingPosX?: number;
  markingPosY?: number;
  markingTextStyle?: CSSProperties;
  maxDiscretePoints?: number;
  grid?: boolean;
  gridStyle?: CSSProperties;
  formatValue: (n: number) => string;
};

export type OnPriceSelected<P extends Price = Price> = (id: string, price: P) => void;

export type LayoutProps<P extends Price = Price> = {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  width?: number;
  height: number;

  // % added to max value in axis Y to avoid hitting ceiling
  maxValueExtraPct: number | undefined;

  // % added to max value in axis Y to avoid hitting bottom
  minValueExtraPct: number | undefined;

  axisX: Axis;
  axisY: Axis;
  allSeries: Series<P>[];
  showHintOnPriceSelected?: Boolean;
  onPriceSelected?: OnPriceSelected<P>;
};

function calcMinMax<P extends Price>(
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

type EnrichedSeries<P extends Price> = Series<P> & {
  enrichedDataset: Series<P>["dataset"];
};

type Plot<P extends Price> = {
  x: number;
  y: number;
  price: P;
  idx: number;
};
type Hint<P extends Price> = {
  ds: EnrichedSeries<P>;
  plot: Plot<P>;
};

const LineChart = (props: LayoutProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(props.width || 100);

  useEffect(() => {
    if (!props.width || props.width < 1) {
      ref.current?.clientWidth && setWidth(ref.current?.clientWidth);
    }
  }, []);

  const [hint, setHint] = useState<Hint<Price> | undefined>(undefined);
  const left = props.marginLeft;
  const right = width - props.marginRight;
  const w = right - left;
  const top = props.marginTop;
  const bottom = props.height - props.marginBottom;
  const h = bottom - top;

  function calcLayout<P extends Price>(series: EnrichedSeries<P>[]) {
    let maxV: undefined | number = undefined;
    let minV: undefined | number = undefined;
    let discretePointsAxisX =
      props.axisX.maxDiscretePoints || maxDiscretePointsAxisX;
    series.forEach((s) => {
      maxV = calcMinMax(s.enrichedDataset, true, maxV);
      minV = calcMinMax(s.enrichedDataset, false, minV);
      discretePointsAxisX = Math.min(
        s.enrichedDataset.length,
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
      ? w / (discretePointsAxisX - 1)
      : 0;
    const discretePointsAxisY =
      props.axisY.maxDiscretePoints || maxDiscretePointsAxisY;
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

  function normalize<P extends Price>(
    allSeries: Series<P>[]
  ): EnrichedSeries<P>[] {
    const ds = allSeries.map((s) => s.dataset.slice());
    const result: EnrichedSeries<P>[] = allSeries.map((s) => ({
      ...s,
      enrichedDataset: [],
    }));
    const dateMap = new Map<number, number>();
    ds.forEach((d) => d.forEach((p) => dateMap.set(p.x, 1)));
    const dates = Array.from(dateMap.keys()).sort();

    ds.forEach((ser, idx) => {
      dates.forEach((dt) => {
        let loop = 0;
        while (loop++ < 1000) {
          let pop = ser.length ? ser[0] : undefined;
          if (pop) {
            if (pop.x === dt) {
              result[idx].enrichedDataset.push(pop);
              ser.shift();
              break;
            } else if (pop.x < dt) {
              result[idx].enrichedDataset.push(pop);
              ser.shift();
            } else {
              const clone = { ...pop, x: dt };
              result[idx].enrichedDataset.push(clone);
              break;
            }
          } else if (result[idx].enrichedDataset.length) {
            let clone =
              result[idx].enrichedDataset[
                result[idx].enrichedDataset.length - 1
              ];
            clone = { ...clone, x: dt };
            result[idx].enrichedDataset.push(clone);
            break;
          } else break;
        }
      });
    });

    return result;
  }

  const normalizedSeries = normalize(props.allSeries);

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
                : Math.round((ds.length / discretePointsAxisX) * i);
            const p = ds[idx];
            const pos = p.x;
            const value = p.y;
            const r: Plot<Price> = {
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

  //console.log({ charts: charts });

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
                  x1={left}
                  y1={bottom - pointY}
                  x2={right}
                  y2={bottom - pointY}
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
              x={left + (props.axisY.markingPosX || 0)}
              y={bottom - pointY + (props.axisY.markingPosY || 0)}
              fontSize={props.axisY.markingTextStyle?.fontSize || "unset"}
              fill={props.axisY.markingTextStyle?.color || "unset"}
              fontWeight={props.axisY.markingTextStyle?.fontWeight || "unset"}
            >
              {props.axisY.formatValue(minV! + gap * i)}
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
                style={props.axisY.style || {}}
              />
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
            x1={pointX}
            y1={bottom}
            x2={pointX}
            y2={top}
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
            x={pointX + (props.axisX.markingPosX || 0)}
            y={bottom + (props.axisX.markingPosY || 0)}
            fontSize={props.axisX.markingTextStyle?.fontSize || "unset"}
            fill={props.axisX.markingTextStyle?.color || "unset"}
            fontWeight={props.axisX.markingTextStyle?.fontWeight || "unset"}
          >
            {charts ? props.axisX.formatValue(charts[0].plots[i].price.y) : "X"}
          </text>
        ) : null;

        return (
          <>
            <line
              key={`axisX_pt${i}`}
              x1={pointX}
              y1={bottom - 3}
              x2={pointX}
              y2={bottom + 3}
              style={props.axisX.style || {}}
            />
            {text}
          </>
        );
      })}
      <line
        key="axisX"
        x1={left}
        y1={bottom}
        x2={right}
        y2={bottom}
        style={props.axisX.style || {}}
      />
    </>
  ) : null;

  const handlePoint = (x: number, y: number, pressed: Boolean, e: any) => {
    //console.log({ x, y, pressed, e });

    if (pressed) {
      // TODO: calculate price?
    }
  };

  const handlePlot = <P extends Price>(ds: EnrichedSeries<P>, plot: Plot<P>) => {
    (props.showHintOnPriceSelected == undefined || props.showHintOnPriceSelected) && setHint({ ds, plot });
    props.onPriceSelected && props.onPriceSelected(ds.id, plot.price);
  };

  return (
    <div ref={ref}>
      {shouldRender ? (
        <svg
          width={`${width}px`}
          height={`${props.height}px`}
          onTouchStart={(e) =>
            e.changedTouches.length
              ? handlePoint(
                  e.changedTouches[0].clientX,
                  e.changedTouches[0].clientY,
                  true,
                  e
                )
              : null
          }
          onTouchEnd={(e) =>
            e.changedTouches.length
              ? handlePoint(
                  e.changedTouches[0].clientX,
                  e.changedTouches[0].clientY,
                  false,
                  e
                )
              : null
          }
          onMouseDown={(e) => handlePoint(e.clientX, e.clientY, true, e)}
          onMouseUp={(e) => handlePoint(e.clientX, e.clientY, false, e)}
        >
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
              const dotStroke = ch.series.lineStyle?.stroke || "white";
              return idx < plots.length - 1 ? (
                <>
                  <line
                    key={`lx_${chIdx}_${idx}`}
                    x1={a.x}
                    y1={a.y}
                    x2={plots[idx + 1].x}
                    y2={plots[idx + 1].y}
                    style={ch.series.lineStyle}
                  />
                  <circle
                    cx={a.x}
                    cy={a.y}
                    r={3}
                    stroke={dotStroke}
                    strokeWidth={2}
                    fill="black"
                    onTouchEnd={(e) => handlePlot(charts[chIdx].series, a)}
                    onClick={(e) => handlePlot(charts[chIdx].series, a)}
                  />
                  {idx == plots.length - 2 ? (
                    <circle
                      cx={plots[idx + 1].x}
                      cy={plots[idx + 1].y}
                      r={3}
                      stroke={dotStroke}
                      strokeWidth={2}
                      fill="black"
                      onTouchEnd={(e) =>
                        handlePlot(charts[chIdx].series, plots[idx + 1])
                      }
                      onClick={(e) =>
                        handlePlot(charts[chIdx].series, plots[idx + 1])
                      }
                    />
                  ) : null}
                </>
              ) : null;
            });
          })}
          {hint ? (
            <>
              <circle
                cx={hint.plot.x}
                cy={hint.plot.y}
                r={5}
                stroke={hint.ds.lineStyle?.stroke || "white"}
                strokeWidth={1}
                fill="white"
              />
              <text
                key="hint"
                x={left + 10}
                y={top + 10}
                fill="white"
                fontWeight="unset"
              >
                {`${hint.ds.label || ""}`}{" "}
                {props.axisX.formatValue(hint.plot.price.x)}{" "}
                {props.axisY.formatValue(hint.plot.price.y)}
              </text>
            </>
          ) : null}
          {svgAxisFrontX}
          {svgAxisFrontY}
        </svg>
      ) : null}
    </div>
  );
};

export default LineChart;
