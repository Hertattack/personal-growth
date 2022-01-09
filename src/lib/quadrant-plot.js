import {raiseEvent} from "./shared.js";

let identity = 0;

class QuadrantPlot {
    constructor(dashboard, area, xDomain, yDomain, xLabels, yLabels) {
        this._id = identity++;

        this._dashboard = dashboard;
        this._area = area;

        this._width = 400;
        this._height = 400;

        this._radius = 5;

        this._xDomain = xDomain;
        this._yDomain = yDomain;

        this._xLabels = xLabels;
        this._yLabels = yLabels;

        this._xScaler = d3.scaleLinear()
            .domain(xDomain)
            .range([this._radius + 1,this._width - this._radius - 1]);

        this._yScaler = d3.scaleLinear()
            .domain(yDomain)
            .range([this._height - this._radius - 1, this._radius + 1]);

        raiseEvent.install(this);

        initialize(this);
    }

    reload(dataPoints) {
        let dataPointsSelection = this._rootGroup
            .selectAll("g.data-point")
            .data(dataPoints, d => d.id)
        ;

        dataPointsSelection
            .exit()
            .remove();

        dataPointsSelection = dataPointsSelection
            .enter()
            .append("g")
            .classed("data-point", true)
            .merge(dataPointsSelection)

        let circles = dataPointsSelection
            .selectAll("circle")
            .data(d=>[d]);

        circles = circles
            .enter()
            .append("circle")
            .attr("r", this._radius)
            .merge(circles)
        ;

        circles
            .attr("cx", d => this._xScaler(d.xValue))
            .attr("cy", d => this._yScaler(d.yValue))
            .on("click", (event,data) => raiseEvent(this, "click", {event, data}))
            .on("mouseover", (event,data) => raiseEvent(this, "mouseover", {event, data}))
            .on("mouseout", (event, data) => raiseEvent(this, "mouseout", {event, data}))
        ;
    }
}

class DataPoint {
    constructor(id, xValue, yValue) {
        this.id = id;
        this.xValue = xValue;
        this.yValue = yValue;
    }
}

export {
    QuadrantPlot,
    DataPoint
}


function initialize(self){
    let svg = self._area
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("preserveAspectRatio", "xMidYMid")
        .attr("viewBox", `0 0 ${self._width} ${self._height}`)
    ;

    self._svg = svg;

    let rootGroup = svg.append("g");
    self._rootGroup = rootGroup;

    let lineMaker = d3.line();

    let xAxis = rootGroup
        .append("g")
        .attr("id", `qp-x-axis-${self._id}`)
    ;

    xAxis
        .append("path")
        .attr("d", lineMaker([[0, self._height / 2], [self._width, self._height / 2]]))
        .classed("qp-axis", true)
        .classed("qp-x-axis", true)
    ;

    xAxis
        .append("text")
        .classed("lower-axis-text", true)
        .classed("axis-text", true)
        .text(self._xLabels[0])
        .attr("transform", `translate(0, ${self._height/2 - 5})`);

    xAxis
        .append("text")
        .text(self._xLabels[1])
        .classed("axis-text", true)
        .classed("higher-axis-text", true)
        .attr("text-anchor", "end")
        .attr("transform", `translate(${self._width}, ${self._height/2 - 5})`);

    let yAxis = rootGroup
        .append("g")
        .attr("id", `qp-y-axis-${self._id}`);

    yAxis
        .append("path")
        .attr("d", lineMaker([[self._width / 2, 0], [self._width / 2, self._height]]))
        .classed("qp-axis", true)
        .classed("qp-y-axis", true)
    ;

    yAxis
        .append("text")
        .classed("axis-text", true)
        .classed("higher-axis-text", true)
        .text(self._yLabels[1])
        .attr("transform", `translate(${self._width / 2 - 12},0) rotate(90)`)
    ;

    yAxis
        .append("text")
        .classed("axis-text", true)
        .classed("lower-axis-text", true)
        .text(self._yLabels[0])
        .attr("text-anchor", "end")
        .attr("transform", `translate(${self._width / 2 - 12},${self._height}) rotate(90)`)
    ;
}