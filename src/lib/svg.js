class Svg {
    constructor(svg, rootGroup) {
        this.svg = svg;
        this.rootGroup = rootGroup;

        this.attr = svg.attr.bind(svg);
    }
}

export default Svg;