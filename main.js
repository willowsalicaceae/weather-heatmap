// python -m http.server 8080
var svg = d3.select('svg');

// Initialize the tooltip
var tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Initialize the dateOptions variable used for formatting the date
var dateOptions = { year: 'numeric', month: 'short', day: 'numeric' };

// Set the number of columns, square size, and spacing in between squares
var numColumns = 7;
var squareSize = 26;
var squareSpacing = 0;

// Initialize the selectedFile, opacityToggle, and viewToggle
var selectedFile = d3.select("input[name='dataset']:checked").property("value");
var opacityToggle = d3.select("input[name='opacity']:checked").property("value");
var viewToggle = d3.select("input[name='view']:checked").property("value");

// Initialize the days variable
var days = ["S", "M", "T", "W", "T", "F", "S"];

// Create new day labels
var dayLabels = svg.selectAll(".dayLabel")
    .data(days);

// Append the day labels to the graph
dayLabels.enter().append("text")
    .attr("class", "dayLabel")
    .text((d) => d)
    .attr("x", squareSize / 2)
    .attr("y", (d, i) => i * (squareSize + squareSpacing) + squareSize / 2)
    .style("text-anchor", "middle")
    .attr("dominant-baseline", "middle");

// Create the color scale
let colorScale = d3.scaleSequential()
  .interpolator(d3.interpolateTurbo)
  .domain([0, 100]);

// Create the precipitation color scale
let precipColorScale = d3.scaleLinear()
  .range(["white", "blue"]);

// Create the opacity scale
let opacityScale = d3.scaleLinear()
  .range([0, 100]);

// Sets the color of a square
function setColor(d) {
  let colorValue, color;
  if (viewToggle === "temp") {
    colorValue = +d.actual_mean_temp;
    color = d3.color(colorScale(colorValue));
  } else {
    colorValue = +d.actual_precipitation;
    color = d3.color(precipColorScale(colorValue));
  }
  let difference;
  if (opacityToggle === "max") {
    difference = Math.abs(+d.actual_max_temp - +d.average_max_temp);
  } else if (opacityToggle === "min") {
    difference = Math.abs(+d.actual_min_temp - +d.average_min_temp);
  }
  color.opacity = opacityScale(difference) / 100;
  if (opacityToggle === "none") {
    color.opacity = 1;
  }
  return color;
}

// Calculates the difference between the given actual and the average value and formats it for the tooltip
function diff(actual, average) {
  let result = actual - average;
  if (result > 0) {
    result = "<div class='higher'>+" + result + "</div>";
  } else if (result < 0) {
    result = "<div class='lower'>" + result + "</div>";
  } else {
    result = "<div class='same'>" + result + "</div>";
  }
  return result;
}

// Sets the tooltip for the given data point
function setTooltip(d) {
  let minDiff = diff(d.actual_min_temp, d.average_min_temp);
  let maxDiff = diff(d.actual_max_temp, d.average_max_temp);
  let date = new Date(d.date);
  return (date.toLocaleDateString("en-US", dateOptions) + "<br/>" +
  `<table><tr><td>💧${d.actual_precipitation}</td><th>L</th><th>M</th><th>H</th></tr>` +
  `<tr><th>Temp</th><td>${d.actual_min_temp}</td><td>${d.actual_mean_temp}</td><td>${d.actual_max_temp}</td>` +
  `<tr><th>Avg</th><td>${d.average_min_temp}</td><td></td><td>${d.average_max_temp}</td>` +
  `<tr><th>Diff</th><td>${minDiff}</td><td></td><td>${maxDiff}</td></table>`
  );
}

// Updates the visualization to reflect the selected options
function updateVisualization() {
  // Updates the settings of the visualization
  selectedFile = d3.select("input[name='dataset']:checked").property("value");
  opacityToggle = d3.select("input[name='opacity']:checked").property("value");
  viewToggle = d3.select("input[name='view']:checked").property("value");

  // Load new data
  d3.csv(selectedFile)
    .then(function(data) {
      // Update the colorScale's and precipColorScale's domain based on viewToggle
      var tempDomain = d3.extent(data, d => +d.actual_mean_temp);
      var precipDomain = d3.extent(data, d => +d.actual_precipitation);
      colorScale.domain([tempDomain[0] - 2, tempDomain[1]]);
      precipColorScale.domain(precipDomain);

      // Update the opacity scale domain
      let maxDifference = d3.max(data, d => Math.abs(+d.actual_max_temp - +d.average_max_temp));
      opacityScale.domain([0, maxDifference]);

      // Bind the new data to the rectangles (create, update, or remove as needed)
      var rects = svg.selectAll("rect")
        .data(data);

      // Update old elements as needed
      rects.transition()
        .duration(1000)
        .attr("x", (d, i) => Math.floor((i + 2) / numColumns) * (squareSize + squareSpacing) + squareSize)
        .attr("y", (d, i) => ((i + 2) % numColumns) * (squareSize + squareSpacing))
        .attr("fill", d => setColor(d));

      // Enter new elements
      rects.enter().append("rect")
        .attr("width", squareSize)
        .attr("height", squareSize)
        .attr("x", (d, i) => Math.floor((i + 2) / numColumns) * (squareSize + squareSpacing) + squareSize)
        .attr("y", (d, i) => ((i + 2) % numColumns) * (squareSize + squareSpacing))
        .attr("fill", d => setColor(d))
        .on("mouseover", function(d) {
          tooltip.transition()
            .duration(200)
            .style("opacity", .9);
          tooltip.html(setTooltip(d));
          var squarePosition = d3.select(this).node().getBoundingClientRect();
          tooltip.style("left", (squarePosition.left + window.pageXOffset + squareSize) + "px")
            .style("top", (squarePosition.top + window.pageYOffset + squareSize) + "px");
        })
        .on("mouseout", function(d) {
          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        })
        .attr("opacity", 0)
        .transition()
        .duration(1000)
        .attr("opacity", 1);

      // Exit old elements
      rects.exit()
        .transition()
        .duration(1000)
        .attr("opacity", 0)
        .remove();
    })
    .catch(function(error) {
      console.log(error);
    });
}

d3.select("#dataset").on("change", updateVisualization);
d3.select("#opacity").on("change", updateVisualization);
d3.select("#view").on("change", updateVisualization);

updateVisualization();
