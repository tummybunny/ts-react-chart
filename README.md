# About

Simple chart react component created for my home-grown application that fits to my specific needs, i.e. plot a few market data series.

It is work in progress...

Example:

![basic minesweeper](https://github.com/tummybunny/ts-react-chart/blob/master/public/example.jpg)

```
import LineChart, { Axis, Price, Series } from "./LineChart";

function numberToDate(num: number) {
  const yr = (num / 10000) | 0;
  const month = ((num % 10000) / 100) | 0;
  const day = num % 100;
  return new Date(yr, month - 1, day);
}

function formatDate(d: Date) {
  return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear();
}

const series1: Series = {
  dataset: [
    { x: 20240601, y: 5 },
    { x: 20240602, y: 5.25 },
    { x: 20240603, y: 6.2 },
    { x: 20240604, y: 5.5 },
    { x: 20240605, y: 5.4 },
    { x: 20240608, y: 5.25 },
    { x: 20240610, y: 5.2 },
    { x: 20240613, y: 6.1 },
    { x: 20240617, y: 5.9 },
    { x: 20240621, y: 4.9 },
    { x: 20240628, y: 6.9 },
  ],
  lineStyle: { stroke: "red", strokeWidth: "3px" },
  label: "tomato",
};

const series2: Series = {
  dataset: [
    { x: 20240601, y: 6.8 },
    { x: 20240603, y: 7.3 },
    { x: 20240605, y: 7.2 },
    { x: 20240608, y: 5.8 },
    { x: 20240610, y: 7.35 },
    { x: 20240611, y: 6.2 },
    { x: 20240612, y: 7.1 },
    { x: 20240615, y: 8.2 },
    { x: 20240616, y: 7.8 },
    { x: 20240619, y: 6.2 },
    { x: 20240621, y: 7.5 },
  ],
  lineStyle: { stroke: "green", strokeWidth: "3px" },
  label: "banana",
};

const series3: Series = {
  dataset: [
    { x: 20240602, y: 4.5 },
    { x: 20240603, y: 5.1 },
    { x: 20240604, y: 6.2 },
    { x: 20240605, y: 7.35 },
    { x: 20240606, y: 6.8 },
    { x: 20240607, y: 6.3 },
    { x: 20240611, y: 7.2 },
    { x: 20240612, y: 5.3 },
    { x: 20240613, y: 5.5 },
    { x: 20240614, y: 6.2 },
    { x: 20240621, y: 6.4 },
    { x: 20240622, y: 6.0 },
    { x: 20240628, y: 6.1 },
  ],
  lineStyle: { stroke: "blue", strokeWidth: "3px" },
  label: "apple",
};

const allSeries = [series1, series2, series3];

const axisX: Axis = {
  maxDiscretePoints: 20,
  style: { stroke: "#808080", strokeWidth: "2px" },
  markings: 5,
  markingPosX: -25,
  markingPosY: 20,
  markingTextStyle: {
    color: "white",
    fontSize: "12px"
  },
  grid: true,
  gridStyle: { stroke: "#303030", strokeWidth: "2px" },
  
  // format date in DD/MM/YYYYY:
  formatValue: (n: number) => formatDate(numberToDate(n)),
};

const axisY: Axis = {
  maxDiscretePoints: 5,
  style: { stroke: "#808080", strokeWidth: "2px" },
  markings: 5,
  markingPosX: -35,
  markingPosY: 5,
  markingTextStyle: {
    color: "white",
    fontSize: "12px"
  },
  grid: true,
  gridStyle: { stroke: "#303030", strokeWidth: "2px" },

  // format number with 2 decimal points:  
  formatValue: (n: number) => (((n * 100) | 0) / 100).toString(),
};

const Example = () => {
  return (
    <LineChart
      marginTop={15}
      marginBottom={30}
      marginLeft={40}
      marginRight={25}
      height={200}
      maxValueExtraPct={10}
      minValueExtraPct={10}
      axisX={axisX}
      axisY={axisY}
      allSeries={allSeries}
      onPriceSelected={(id, price) => console.log({id, price})}
    ></LineChart>
  );
};

export default Example;
```


## DRY note

Yes I've tried other open source charts, but they didn't fit my specific needs.
