import Svg from "./svg.js";
import GrowthPlot from "./growth-plot.js";
import PerformanceLog from "./performance-log.js";
import performanceLog from "./performance-log.js";
import {QuadrantPlot, DataPoint} from "./quadrant-plot.js";
import {raiseEvent} from "./shared.js";

class Dashboard {
    constructor() {
        this._data = buildEmptyData();

        this.graphAreaSelector = "#graphs";
        this.dataAreaSelector = "#data";
        this.performanceLogSelector = "#performance-log";
        this.goalsSelector = "#goals";
        this.quadrantPlotSelector = "#quadrantPane";

        this.width = "100%";
        this.height = "500";

        raiseEvent.install(this);

        this.tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        this.events = {
            INITIALIZED : "initialized",
            DATA_CHANGED: "data-changed",
            SELECTION_CHANGED: "selection-changed"
        };
    }

    showTooltip(event, selectionType, data) {
        let tooltip = this.tooltip;

        tooltip.html("");

        tooltip.transition()
            .duration(200)
            .style("opacity", .9);

        if (selectionType == "history") {
            tooltip.html(
`[${data.date.toLocaleDateString()}] ${data.title}</span><br>`);
        }else{
            tooltip.text("unsupported");
        }

        tooltip
            .style("left", (event.pageX) + "px")
            .style("top", (event.pageY - 28) + "px");

    }

    hideTooltip(){
        this.tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    }

    select(selectionType, data){
        raiseEvent(this, this.events.SELECTION_CHANGED, { selectionType,  data });
    }

    clear(){
        this.loadData(buildEmptyData());
    }

    initialize(optionalInitialData) {
        let graphArea = d3.select(this.graphAreaSelector);

        graphArea.text("");

        let svg = graphArea
            .append("svg")
            .attr("width", this.width)
            .attr("height", this.height);

        graphArea
            .append("br");

        let resetButton = graphArea
            .append("button")
            .attr("type","button")
            .classed("btn", true)
            .classed("btn-primary",true)
            .classed("action-button", true)
            .text("Reset zoom");

        let addLogEntryButton = graphArea
            .append("button")
            .attr("type","button")
            .classed("btn", true)
            .classed("btn-primary",true)
            .classed("action-button", true)
            .attr("data-bs-toggle","modal")
            .attr("data-bs-target", `#${PerformanceLog.MODAL_ID}`)
            .text("Add entry");

        resetButton.node().onclick = () => {
                this._mainSvg.rootGroup.attr("transform", d3.zoom().transform(this._mainSvg.rootGroup , d3.zoomIdentity));
            };

        svg.classed("main-graph",true);

        svg.call(
            d3.zoom()
                .scaleExtent([-500, 500])
                .on("zoom", (event)=> {
                    this._mainSvg.rootGroup.attr("transform", event.transform);
                }));

        let rootGroup = svg.append("g");
        this._mainSvg = new Svg(svg, rootGroup);

        let quadrantArea = d3.select(this.quadrantPlotSelector);
        this._energyQuadrant = new QuadrantPlot(
            this,
            quadrantArea,
            [PerformanceLog.MIN_ENERGY, PerformanceLog.MAX_ENERGY],
            [PerformanceLog.MIN_VALUE, PerformanceLog.MAX_VALUE],
            ["very draining", "very energizing"],
            [PerformanceLog.ValueMapper(PerformanceLog.MIN_VALUE),PerformanceLog.ValueMapper(PerformanceLog.MAX_VALUE)]
        );

        this._energyQuadrant.on("click", (args)=>this.select("history", args.data));
        this._energyQuadrant.on("mouseover", (args)=>{
            let data = this._data.history.filter(h=>h.id == args.data.id)[0];

            if(!data)
                return;

            this.showTooltip(args.event, "history", data);
        });
        this._energyQuadrant.on("mouseout",  _ => this.hideTooltip());

        this.on(this.events.DATA_CHANGED, (newData)=>{
           let dataPoints = newData.history.map(h=>new DataPoint(h.id, h.energy, h.value));
           this._energyQuadrant.reload(dataPoints);
        });

        this._growthPlot = new GrowthPlot(this, this._mainSvg);
        this._performanceLog = new PerformanceLog(this, this.performanceLogSelector);

        if(optionalInitialData)
            this.loadData(optionalInitialData);

        raiseEvent(this, "initialized");
    }

    downloadData(fileName){
        let jsonData = getJsonData(this);

        let downloadNode = d3.select("body")
            .append("a")
            .attr("href", jsonData)
            .attr("download", fileName)
            .node();

        downloadNode.click();
        downloadNode.remove();
    }

    refresh(reloadData){
        if(!reloadData)
            raiseEvent(this, "data-changed", this._data);

        this.loadData(this._data);
    }

    loadData(data){
        let newData = buildEmptyData();
        try {
            if (data.history) {
                if(!Array.isArray(data.history) || !data.history.every(validateAndUnifyHistoryData))
                    throw new Error("Historical data (history) should be an array of objects.");

                let history = data.history.sort((a,b) => d3.ascending(a.date || Date.now(), b.date || Date.now()));

                newData.history = history;
            }
        }catch(ex){
            console.log(ex);
            if(this._data && !this._errorLoadingData) {
                this._errorLoadingData = true;
                this.loadData(this._data);
            }
            this._errorLoadingData = false;
            return;
        }

        //this._data.history = merge(this._data.history, newData.history);
        this._data = newData;

        raiseEvent(this, "data-changed", newData);
    }
}

export default Dashboard;

function validateAndUnifyHistoryData(entry, index) {
    if(typeof(entry) !== 'object' || Array.isArray(entry))
        return false;

    entry.errors = [];

    if(entry.date === undefined) {
        entry.errors.push("Missing entry date.");
        entry.date = new Date(Date.now());
    }

    if(typeof(entry.date) === 'string'){
        try{
            entry.date = new Date(Date.parse(entry.date));
        }catch(ex){
            entry.errors.push(`Could not parse entry date: '${entry.date}'. ${ex.message}`);
        }
    }else if(typeof(entry.date) === 'number'){
        try{
            entry.date = new Date(entry.date);
        }catch(ex){
            entry.errors.push(`Could not parse entry date: '${entry.date}'. ${ex.message}`);
        }
    }

    if(entry.id === undefined)
        entry.id = index;

    if(typeof(entry.value) !== 'number'){
        entry.value = 0;
        entry.errors.push(`Value is not a number. Value was '${entry.value}, reset to 0.'`);
    }else if(entry.value < PerformanceLog.MIN_VALUE){
        entry.value = performanceLog.MIN_VALUE;
        entry.errors.push(`Value was out of bounds (too low). Value was '${entry.value}, reset to ${PerformanceLog.MIN_VALUE}.'`);
    }else if(entry.value > PerformanceLog.MAX_VALUE){
        entry.value = performanceLog.MAX_VALUE;
        entry.errors.push(`Value was out of bounds (too high). Value was '${entry.value}, reset to ${PerformanceLog.MAX_VALUE}.'`);
    }

    if(typeof(entry.energy) === 'string'){
        try{
            let intEnergy = parseInt(entry.energy);
            entry.energy = intEnergy;
        }catch(ex){
            entry.errors.push(`Could not parse '${entry.energy}' to an int.`);
        }
    }

    if(typeof(entry.energy) !== 'number'){
        entry.energy = 0;
        entry.errors.push(`Energy is not a number. Value was '${entry.energy}, reset to 0.'`);
    }else if(entry.energy < PerformanceLog.MIN_ENERGY){
        entry.energy = performanceLog.MIN_ENERGY;
        entry.errors.push(`Energy was out of bounds (too low). Value was '${entry.energy}, reset to ${PerformanceLog.MIN_ENERGY}.'`);
    }else if(entry.energy > PerformanceLog.MAX_ENERGY){
        entry.energy = performanceLog.MAX_ENERGY;
        entry.errors.push(`Energy was out of bounds (too high). Value was '${entry.energy}, reset to ${PerformanceLog.MAX_ENERGY}.'`);
    }

    if(entry.title === undefined)
        entry.title = "No title";

    if(entry.description === undefined)
        entry.description = "No description";

    return true;
}

function buildEmptyData(){
    return {
        history : [],
        future : {}
    };
}

function getJsonData(self){
    let data = self._data || buildEmptyData();

    return "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data,null, 2));
}