<script>

  // graphical interactive linear interpolation function generator ... in svelte : )

  // sample data: Natural Color System (NCS) compared to RGB HSL HSV color systems
  // goal: find a piecewise linear approximation of the ncs2rgb and rgb2ncs function
  // this seems to be the first attempt to find a rgb2ncs function
  // the function should be optimized for time (performance) at the cost of size.
  // for this, we use only linear interpolation (not quadratic or cubic)
  // and we limit the X values to a grid
  // so we can lookup the segment by its index (X / gridSize)|0
  // and we can avoid binary search to find the segment

  // author: milahu @ { gmail.com, github.com }
  // date: 2021-02-28
  // based on: https://github.com/mhkeller/layercake-template
  // license: CC0-1.0

  // TODO add "graphical function editor" to interactively generate an interpolation function to fit the scatter plot
  // TODO show color gradient below x axis to visualize the interpolation result
  // TODO store state in URL hash
  // TODO restore padding for <Svg> and fix the initial zoom (remove the workaround in function resetView)



  // TODO restore
  //import { LayerCake, Svg } from 'layercake'; // https://github.com/mhkeller/layercake

  import { LayerCake } from 'layercake';
  import Svg from './components/Svg.svelte'; // patched version

  import svgPanZoom from 'svg-pan-zoom';

  import { scaleOrdinal } from 'd3-scale';
  import { onMount } from 'svelte';
  import { writable, derived } from 'svelte/store';

  //import ScatterSvg from './components/Scatter.svg.svelte';
  //import Line from './components/Line.svelte';
  import MultiLine from './components/MultiLine.svelte';
  import MultiScatterSvg from './components/MultiScatter.svg.svelte';

  import AxisX from './components/AxisX.svelte';
  import AxisY from './components/AxisY.svelte';

  import { ncsData } from './ncscolor-helper.js';



  let blackness = 0;
  let blacknessInputValue = blackness;
  let chromaticness = 100;
  let chromaticnessInputValue = chromaticness;
  let normalize = true;
  let xDomain = 'hue';
  let svgElement;
  let interpolateKey = 'hsl_h'; // what data set should we interpolate?

  const interpolateGridSize = 10;
  const xMax = { hue: 400, chromaticness: 100, blackness: 100 };
  const svgPanZoomInstance = writable();
  const layercakeCustom = {
    svgPanZoomInstance
  };
  const xKey = 0;
  const yKey = 1; // group.values[idx][1]
  const zKey = 'stroke'; // group.stroke
  //const xKey = d => d[0];
  //const yKey = d => d[1];
  //const zKey = g => g.stroke;

  const dotRadius = 2;
  const strokeWidth = 1;
  const padding = 10;

  // degrees are defined in function ncsHueOfDegrees in ncscolor-helper.js
  // object keys must be strings
  const xTickNames = { '0': 'Red', '100': 'Blue', '200': 'Green', '300': 'Yellow', '400': 'Red' };

  $: dataLongAll = ncsData({ xDomain, blackness, chromaticness, normalize });
  //data.forEach(d => (d[yKey] = +d[yKey])); // convert to number
  $: groupKeys = dataLongAll.map(group => group.key);
  $: interpolateGroup = dataLongAll.find(g => g.key == interpolateKey);
  $: dataInterpolation = [
    {
      editable: 'y',
      values: (

        Array.from({ length: 1 + (xMax[xDomain] / interpolateGridSize) }) // +1: add last index
        // TODO sync first and last value for circular functions (steadiness)

        .map((_, i) => [ i*interpolateGridSize, 50 ])
        .map(([x, y]) => {
          let xy0 = (
            interpolateGroup.values.find(([x0, y0]) => (x0 == x)) || // exact value
            (
              [
                // two nearest points
                interpolateGroup.values.map(([x0, y0]) => [x0, y0, Math.abs(x0-x)]).sort((a, b) => a[2] - b[2]).slice(0, 2)
              ]
              .map(([[xa, ya], [xb, yb]]) => [ x, ((x-xa)*(yb-ya)/(xb-xa)+ya) ])[0] // linear interpolation
            )
          );
          if (xy0 != undefined && !isNaN(xy0[1]) && isFinite(xy0[1])) {
            y = xy0[1]; // exact or interpolated value
          }
          return [x, y]; // pseudo value
        })
      ),
      key: 'ipol_1',
      stroke: 'orange',
    },
  ];
  $: dataLong = [ ...dataLongAll, ...dataInterpolation ];
  $: seriesNames = dataLong.map(g => g.key);
  $: seriesColors = dataLong.map(g => g.stroke);

  const flatten = data => data.reduce((acc, group) => acc.concat(group.values), []);



  // svg pan and zoom

  onMount(() => {
    svgPanZoomInstance.set(svgPanZoom(svgElement, {
      // options. see https://github.com/ariutta/svg-pan-zoom
    }));
    resetView(); // TODO avoid this workaround
  });

  function stopPan() {
    $svgPanZoomInstance && $svgPanZoomInstance.disablePan();
  }

  function startPan() {
    $svgPanZoomInstance && $svgPanZoomInstance.enablePan();
  }

  function resetView() {
    $svgPanZoomInstance.reset();
    //console.dir({ spz_sizes_reset: $svgPanZoomInstance.getSizes() });
    $svgPanZoomInstance.zoom(1 / $svgPanZoomInstance.getSizes().realZoom); // TODO avoid this workaround
    //console.dir({ spz_sizes_realzoom1: $svgPanZoomInstance.getSizes() });
  }



  function handleRangeWheel(event) {
    event.target.valueAsNumber -= Math.sign(event.deltaY);
    event.target.dispatchEvent(new Event('change'))
  }

  function formatTickX(d) {
    if (xDomain == 'hue' && ''+d in xTickNames) {
      return xTickNames[d];
    }
    return d;
  }

  /*
  // problem: this is very slow for large data sets
  // TODO solve with css
  let hiddenGroups = new Set();
  $: dataLong = ((hiddenGroups) => {
    const res = dataLongAll.filter(group => hiddenGroups.has(group.key) == false);
    console.log(`filter ${dataLongAll.length} to ${res.length}`);
    return res;
  })(hiddenGroups);

  // TODO this is too slow. solve with CSS
  function changeGroupVisible(event, groupKey) {
    if (event.target.checked == true) {
      hiddenGroups.delete(groupKey);
      console.log(`show ${groupKey}`);
    }
    else {
      hiddenGroups.add(groupKey);
      console.log(`hide ${groupKey}`);
    }
    hiddenGroups = hiddenGroups; // trigger svelte reactivity
  }
  */

</script>

<main>

  <div class="control">

    <div>
      xDomain
      <button class:active={xDomain == 'hue'} on:click={() => xDomain = 'hue'}>hue</button>
      <button class:active={xDomain == 'chromaticness'}
        on:click={e => (xDomain = 'chromaticness', blacknessInputValue = blackness = 50)}>chromaticness</button>
      <button class:active={xDomain == 'blackness'} on:click={() => xDomain = 'blackness'}>blackness</button>
    </div>

    <div>
      blackness
      <input disabled={xDomain == 'blackness'} type="range" min="0" max="100" on:wheel={handleRangeWheel}
        on:change={e => blackness = event.target.valueAsNumber} bind:value={blacknessInputValue} />
      {blacknessInputValue}
    </div>

    <div>
      chromaticness
      <input disabled={xDomain == 'chromaticness'} type="range" min="0" max="100" on:wheel={handleRangeWheel}
        on:change={e => chromaticness = e.target.valueAsNumber} bind:value={chromaticnessInputValue} />
      {chromaticnessInputValue}
    </div>

    <div>
      <label style="user-select: none">
        <input type="checkbox" bind:checked={normalize}>
        normalize
      </label>
    </div>

    <div>
      <button on:click={resetView}>Reset View</button>
    </div>

  </div>

<!-- TODO solve with css
  <div class="control">
    <div>
      graphs
      {#each groupKeys as groupKey}
        <label style="user-select: none">
          <input type="checkbox" checked on:change={(event) => changeGroupVisible(event, groupKey)}>
          {groupKey}
        </label>
      {/each}
    </div>
  </div>
-->

  <div class="chart-container">
  <!--
      padding={{ top: 10, right: 5, bottom: 20, left: 25 }}
  -->
    <LayerCake
      padding={{ top: 0, right: 0, bottom: 0, left: 0 }}
      xPadding={[padding, padding]}
      yPadding={[padding, padding]}

      x={xKey}
      y={yKey}
      z={zKey}

      yDomain={[0, null]}
      zScale={scaleOrdinal()}
      zDomain={seriesNames}
      zRange={seriesColors}

      flatData={flatten(dataLong)}
      data={dataLong}

      custom={layercakeCustom}
    >

      <Svg bind:svg={svgElement}>

        <AxisX formatTick={formatTickX} />
        <AxisY ticks={9} />

        <MultiLine strokeWidth={strokeWidth} />
        <MultiScatterSvg r={dotRadius} rHover={2 * dotRadius} on:editStart={stopPan} on:editStop={startPan} />

      </Svg>

    </LayerCake>

  </div>

</main>

<style>

  .chart-container {
    width: 100%; height: 100%; /* <LayerCake> element will fit to container size */
    user-select: none; /* disable text selection on click + drag */
  }

  :global(*) {
    margin: 0; padding: 0;
  }

  main {
    width: 100%; height: 100%;
    display: flex;
    flex-direction: column;
  }

  .control {
    display: flex;
  }

  .control > div {
    margin-right: 2em;
    display: flex;
    align-items: center;
  }

  .control > div > input {
    margin: 0 0.5em;
  }

  .control > div > button {
    margin: 0;
    margin-left: 0.5em;
    padding: 0.1em 0.2em;
  }

  .control button.active {
    background: #215ede80;
  }
  .control button:hover {
    background: #215ede40;
  }

</style>
