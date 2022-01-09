class PerformanceLog {
    constructor(dashboard, selector) {
        this._dashboard = dashboard;

        this._targetNode = d3.select(selector);
        this._targetNode.html("");

        dashboard.on(dashboard.events.DATA_CHANGED, data => reload(this, data.history));
        dashboard.on(dashboard.events.SELECTION_CHANGED, eventData => eventData.selectionType == 'history' && changeSelection(this, eventData.data));
    }
}

PerformanceLog.MIN_VALUE = -5;
PerformanceLog.MAX_VALUE = 5;
PerformanceLog.MIN_ENERGY = -5;
PerformanceLog.MAX_ENERGY = 5;
PerformanceLog.MODAL_ID = "performance-log-add-entry-modal";

const VALUE_LABELS = [
    "complete failure",
    "mostly failed",
    "a lot of things to learn",
    "improvements are needed",
    "getting there",
    "ok",
    "that went well",
    "quite happy with the result",
    "much better then average",
    "hard to see any improvements",
    "mastery achieved"
];

const valueMapperScaler = d3.scaleLinear()
    .domain([PerformanceLog.MIN_VALUE, PerformanceLog.MAX_VALUE])
    .range([0,10]);

PerformanceLog.ValueMapper = function(value){
    let intValue = typeof(value) === 'string' ? parseInt(value) : value;
    return VALUE_LABELS[valueMapperScaler(value)];
}

export default PerformanceLog;

const PERFORMANCE_LOG_ID = "performance-log-accordion";

function addEntry(self, entryData){

}

function changeSelection(self, data){
    d3.select(`#${headerId(data)} button.accordion-button`).node().click();
}

function energyClass(dataPoint){
    return `energy-${dataPoint.energy>=0?'positive':'negative'}-${Math.abs(dataPoint.energy)}`;
}

function reload(self, data) {
    self._targetNode.html("");

    let accordion = self._targetNode
        .append("div");

    accordion
        .attr("id", PERFORMANCE_LOG_ID)
        .classed("accordion", true);

    addAddModal(self);

    let selection = accordion
        .selectAll(".accordion-item")
        .data(data, d=>d.id)
        .enter()
        .append("div")
        .classed("accordion-item", true)
        .call(createAccordionItems.bind(null, self))
    ;
}

function headerId(d) { return `pl-entry-header-${d.id}`; };
function bodyId(d) { return `pl-entry-body-${d.id}`; };
function formId(d) { return `pl-entry-form-${d.id}`;};

function createAccordionItems(self, selection){
    let header = selection
        .append("h2")
        .attr("id", headerId)
        .classed("accordion-header", true)
    ;

    let button = header
        .append("button")
        .classed("accordion-button", true)
        .classed("collapsed", true)
        .attr("type", "button")
        .attr("data-bs-toggle", "collapse")
        .attr("data-bs-target", d =>`#${bodyId(d)}`)
        .attr("aria-controls", bodyId)
    ;
    button
        .text(d => `${d.date.toLocaleString()} - ${d.title} `)
        .append("span")
        .attr("class", energyClass)
        .classed("rounded-circle", true)
        .text("E")
    ;

    let form = selection
        .append("div")
        .attr("id", bodyId)
        .attr("aria-labelledby", bodyId)
        .attr("data-bs-parent", `#${PERFORMANCE_LOG_ID}`)
        .classed("accordion-collapse", true)
        .classed("collapse", true)
        .append("div")
        .classed("accordion-body", true)
        .append("form")
        .on("submit", processForm.bind(null, self))
        .attr("id", formId);
    ;

    form
        .call(addTitleField)
        .call(addValueRange)
        .call(addEnergyRange)
        .call(addDescriptionField)
    ;

    form
        .append("button")
        .attr("type", "button")
        .classed("btn", true)
        .classed("btn-primary",true)
        .text("Save")
        .on("click", processForm.bind(null, self));
}

function processForm(self, event, data){
    let form = d3.select(`#${formId(data)}`).node();

    let changed = false;

    if(form.title.value != data.title) {
        changed = true;
        data.title = form.title.value;
    }

    if(form.energy.value != data.energy){
        changed = true;
        data.energy = parseInt(form.energy.value);
    }

    if(form.value.value != data.value){
        changed = true;
        data.value = parseInt(form.value.value);
    }

    if(form.description.value != data.description){
        changed = true;
        data.description = form.description.value;
    }

    if(changed)
        self._dashboard.refresh();
}

function addEnergyRange(selection){
    function energyId(d) { return `pl-energy-${d.id}`;};

    let container = selection
        .append("div")
        .classed("mb-3", true)
    ;

    container
        .append("label")
        .attr("for", energyId)
        .classed("form-label", true)
        .append("b")
        .text("Energy")
    ;

    let row = container
        .append("div")
        .classed("row", true)
        .classed("gx-5", true);

    row.append("div")
        .classed("col-2", true)
        .text("Very draining")
    ;

    row
        .append("div")
        .classed("col-8", true)
        .append("input")
        .classed("form-range", true)
        .attr("type", "range")
        .attr("id", energyId)
        .attr("name", "energy")
        .attr("min", PerformanceLog.MIN_ENERGY)
        .attr("max", PerformanceLog.MAX_ENERGY)
        .attr("value", d=>d.energy)
    ;

    row
        .append("div")
        .classed("col-2", true)
        .text("Very energizing")
}

function addValueRange(selection){
    function valueId(d) { return `pl-value-${d.id}`;};
    function previewId(d) { return `${valueId(d)}-preview`; };

    let container = selection
        .append("div")
        .classed("mb-3", true)
    ;

    let label = container
        .append("label")
        .attr("for", valueId)
        .classed("form-label", true)

    label
        .append("b")
        .text("How happy are you with the result?")
    ;

    label
        .append("br");
    label
        .append("br");

    label
        .append("span")
        .text("Selected value: ")
        .append("span")
        .classed("current-value", true)
        .attr("id", previewId)
        .text(d=>PerformanceLog.ValueMapper(d.value));

    let row = container
        .append("div")
        .classed("row", true)
        .classed("gx-5", true);

    row.append("div")
        .classed("col-2", true)
        .text(PerformanceLog.ValueMapper(PerformanceLog.MIN_VALUE))
    ;

    row
        .append("div")
        .classed("col-8", true)
        .append("input")
        .classed("form-range", true)
        .attr("type", "range")
        .attr("id", valueId)
        .attr("name", "value")
        .attr("min", PerformanceLog.MIN_VALUE)
        .attr("max", PerformanceLog.MAX_VALUE)
        .attr("value", d=>d.value)
        .on("change", (e,d) => {
            d3.select(`#${previewId(d)}`).text(PerformanceLog.ValueMapper(e.currentTarget.value));
        })
    ;

    row
        .append("div")
        .classed("col-2", true)
        .text(PerformanceLog.ValueMapper(PerformanceLog.MAX_VALUE))
}


function addDescriptionField(selection){
    function descriptionId(d) { `pl-description-${d.id}`;};

    let container = selection
        .append("div")
        .classed("mb-3", true)
    ;

    container
        .append("label")
        .attr("for", descriptionId)
        .classed("form-label", true)
        .append("b")
        .text("Log entry")
    ;

    container
        .append("textarea")
        .classed("form-control", true)
        .attr("id", descriptionId)
        .attr("name", "description")
        .attr("rows", "5")
        .text(d=>d.description)
    ;
}

function addTitleField(selection){
    function titleId(d) { return `pl-title-${d.id}`;};
    let container = selection
        .append("div")
        .classed("mb-3", true)
    ;

    container
        .append("label")
        .attr("for", titleId)
        .classed("form-label", true)
        .append("b")
        .text("Title")
    ;

    container
        .append("input")
        .attr("type", "text")
        .attr("name", "title")
        .attr("id", titleId)
        .classed("form-control", true)
        .attr("value", d=>d.title)
    ;
}

function addDateField(selection){
    function dateId(d) { return `pl-date-${d.id}`;};
    let container = selection
        .append("div")
        .classed("mb-3", true)
    ;

    container
        .append("label")
        .attr("for", dateId)
        .classed("form-label", true)
        .append("b")
        .text("Entry date")
    ;

    container
        .append("input")
        .attr("type", "text")
        .attr("name", "date")
        .attr("id", dateId)
        .classed("form-control", true)
        .attr("value", (new Date(Date.now())).toLocaleString())
    ;
}

function addAddModal(self){
    if(self._modalInitialized)
        return;

    self._modalInitialized = true;

    d3.select("body")
        .append("div")
        .classed("modal", true)
        .attr("tabindex", "-1")
        .attr("id", PerformanceLog.MODAL_ID)
        .html(BASE_MODAL)
    ;

    let modal = d3.selectAll(`#${PerformanceLog.MODAL_ID}`)
        .data([{
            id: "new-entry",
            value: 0,
            energy: 0
        }]);

    let form = modal
            .select(".modal-body")
            .append("form")
            .on("submit", () => modal.select(".btn-primary").click())
            .attr("id", formId)
    ;

    form
        .call(addTitleField)
        .call(addDateField)
        .call(addValueRange)
        .call(addEnergyRange)
        .call(addDescriptionField)
    ;

    modal.select(".btn-secondary")
        .on("click", ()=>resetModalForm(modal, form))
    ;

    modal.select(".btn-primary")
        .on("click",(e,d)=>{
            let entry = createEntry(self, modal.select("form").node());

            if(entry) {
                self._dashboard._data.history.push(entry);
                self._dashboard.refresh(true);

                modal.select(".btn-secondary")
                    .node()
                    .click()
                ;
            }
        });
}

function resetModalForm(modal, form){
    modal.data.energy = 0;
    modal.data.value = 0;
    let formNode = form.node();
    formNode.title.value = "";
    formNode.description.value ="";
    formNode.energy.value = 0;
    formNode.value.value = 0;
}

function createEntry(self, form){
    let history = self._dashboard._data.history;
    let entry = {
        id: d3.max(history.map(h=>h.id)) + 1 || 1,
        date: new Date(Date.now()),
        title: "No title",
        description: "",
        energy: 0,
        value: 0
    };

    if(form.title.value != "") {
        entry.title = form.title.value;
    }

    if(form.date.value != "") {
        entry.date = new Date(Date.parse(form.date.value));
    }

    if(form.energy.value != ""){
        entry.energy = parseInt(form.energy.value);
    }

    if(form.value.value != ""){
        entry.value = parseInt(form.value.value);
    }

    if(form.description.value != ""){
        entry.description = form.description.value;
    }

    return entry;
}

const BASE_MODAL = `<div class="modal-dialog performance-log-modal">
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">Add Log Entry</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary">Save changes</button>
        </div>
    </div>
</div>`;