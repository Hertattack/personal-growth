import PerformanceLog from "./performance-log.js";

class GrowthPlot {
    constructor(dashboard, svg) {
        this._dashboard = dashboard;
        this._svg = svg;

        this._width = 2048;
        this._height = 512;

        this._padding = 10;

        this._domainMin = 0;
        this._domainMid = 10.5;
        this._domainMax = 21;

        this._xScaler = d3.scaleLinear()
            .domain([this._domainMin, this._domainMax])
            .range([this._padding, this._width - this._padding]);

        this._yScaler = d3.scaleLinear()
            .domain([this._domainMin, this._domainMax])
            .range([this._padding, this._height - this._padding]);

        svg
            .attr("preserveAspectRatio", "xMidYMid")
            .attr("viewBox", `0 0 ${this._width} ${this._height}`);

        initialize(this);
        dashboard.on(dashboard.events.DATA_CHANGED, (newData)=>this.plotHistoricalData(newData.history));
    }

    plotHistoricalData(data){
        let pointScaler = d3.scaleLinear()
            .domain([0, data.length-1])
            .range([this._domainMid-1, this._domainMin+0.5]);

        let lineTicks = data.map((_,i)=>pointScaler(i));

        createHistoryGroup(this);

        let lines = drawHorizontalLines(this, this._history, lineTicks);

        let curve = [];
        curve.push([this._xScaler(this._domainMid), this._yScaler(this._domainMid)]);

        let circleData = data.reverse().map(
            (dataPoint, lineIndex) => {
                let linePoints = lines[lineIndex];

                let valuePositionScaler = d3.scaleLinear()
                    .domain([PerformanceLog.MIN_VALUE,PerformanceLog.MAX_VALUE])
                    .range([linePoints[1][1], linePoints[0][1]]);

                let curvePoint = [linePoints[0][0],valuePositionScaler(dataPoint.value)];
                curve.push(curvePoint);

                return {
                    cx: curvePoint[0],
                    cy: curvePoint[1],
                    r:  5 + 0.5 * lineIndex,
                    energyClass: energyClass(dataPoint),
                    data: dataPoint
                }
            }
        );

        let selection = this._history
            .selectAll("g.data-point");

        selection.remove();

        selection
            .data(circleData, d=>d.data.id)
            .enter()
            .append("g")
            .classed("data-point", true)
            .append("circle")
            .attr("r", d => d.r)
            .attr("cx", d=> d.cx)
            .attr("cy", d=>d.cy)
            .attr("class",d=>d.energyClass)
            .on("mouseover", (event,d) => {
                this._dashboard.showTooltip(event, "history", d.data);
            })
            .on("mouseout", this._dashboard.hideTooltip.bind(this._dashboard))
            .on("click", (event, circleData) => {
                this._dashboard.select("history", circleData.data);
            })
        ;


        let lm = d3.line()
            .curve(d3.curveLinear);

        this._history
            .append("path")
            .classed("history-curve", true)
            .attr("d", lm(curve));
    }
}

export default GrowthPlot;

function energyClass(dataPoint){
    return `energy-${dataPoint.energy>=0?'positive':'negative'}-${Math.abs(dataPoint.energy)}`;
}

function createHistoryGroup(self) {
    if(self._history)
        self._history.remove();

    self._history = self._svg.rootGroup
        .append("g")
        .attr("id","history");
}

function initialize(self){
    let cross = self._svg.rootGroup
        .append("g")
        .attr("id","cross");

    createHistoryGroup(self);

    self._future =  self._svg.rootGroup
        .append("g")
        .attr("id","future");

    self._line1Points = [
        [self._padding,self._padding],
        [self._width - self._padding, self._height - self._padding]
    ];

    self._line2Points = [
        [self._padding , self._height - self._padding],
        [self._width - self._padding, self._padding]
    ];

    self._middleLinePoints = [
        [self._padding, self._height / 2],
        [self._width - self._padding, self._height / 2]
    ];

    drawLine(cross, self._line1Points);
    drawLine(cross, self._middleLinePoints);
    drawLine(cross, self._line2Points);

    drawHorizontalLines(self, self._history, [0,1,2,3,4,5,6,7,8,9]);
    drawHorizontalLines(self, self._future, [11,12.5,15,19.5]);
}

function drawHorizontalLines(self, group, ticks){

    let leftTickMapper = (tick) => [
        [self._xScaler(self._domainMin + tick), self._yScaler(self._domainMin + tick)],
        [self._xScaler(self._domainMin + tick), self._yScaler(self._domainMax - tick)]
    ];
    let rightTickMapper = (tick) => [
        [self._xScaler(self._domainMin + tick), self._yScaler(self._domainMax - tick)],
        [self._xScaler(self._domainMin + tick), self._yScaler(self._domainMin + tick)]
    ];

    let lines = [];

    ticks.forEach( tick => {
        let coordinates = tick >= self._domainMid
            ? rightTickMapper(tick)
            : leftTickMapper(tick);

        lines.push(coordinates);

        drawLine(group, coordinates);
    });

    return lines;
 }

function drawLine(group, coordinates){
    let lineMaker = d3.line();

    group
        .append("path")
        .attr("d", lineMaker(coordinates))
        .attr("fill", "none")
        .attr("stroke", "black");
}