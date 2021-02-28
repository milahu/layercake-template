<script>
  import { getContext, createEventDispatcher } from 'svelte';

  const { config, data, x, y, xGet, yGet, zGet, xScale, yScale, padding,
    custom, extents, domain, width, height, reverse, range, percentScale } = getContext('LayerCake');

  // TODO why this fails?
  import getDefaultRange from 'layercake/src/settings/getDefaultRange.js';

  const dispatchEvent = createEventDispatcher();

  const { svgPanZoomInstance } = $custom;
  //$: svgPanZoomInstance = $svgPanZoomInstance_store;

  export let r = 5;
  $: rDouble = 2 * r;

  export let rHover = 10;

  export let editable = false;
  function handleMouseDown(startEvent, groupIndex, dataIndex) {
    dispatchEvent('editStart');
    
    // too complex
    //stopHover = true;

    //console.log(`move group ${groupIndex} point ${dataIndex} @ ${$data[groupIndex].values[dataIndex].join(' ')}`);

    // TODO generate T2 (second transformer)
    // xScaleTransformed = ...

    //console.dir({ custom_svgPanZoomInstance: $custom.svgPanZoomInstance });
    //console.dir({ custom_svgPanZoomInstance: $svgPanZoomInstance });

    const { x: spzPanX, y: spzPanY } = $svgPanZoomInstance.getPan();
    const spzRealZoom = $svgPanZoomInstance.getSizes().realZoom;

    /*
    console.dir({
      getZoom: $svgPanZoomInstance.getZoom(),
      getPan: $svgPanZoomInstance.getPan(),
      getSizes: $svgPanZoomInstance.getSizes(),
      realZoom: $svgPanZoomInstance.getSizes().realZoom,
    });
    */

    //console.log(`pad ${$padding.left} ${$padding.top}   pan ${spzPanX} ${spzPanY}   zoom ${spzRealZoom}`);

    // cache values -> move faster

    const biasLeft = $padding.left*spzRealZoom + spzPanX;
    const biasTop = $padding.top*spzRealZoom + spzPanY;

    //const biasLeft = ($padding.left + spzPanX)*spzRealZoom;
    //const biasTop = ($padding.top + spzPanY)*spzRealZoom;

    const moveMouse = (
      $data[groupIndex].editable == true ? (
        moveEvent => {
          const x = (moveEvent.offsetX - biasLeft) / spzRealZoom;
          const y = (moveEvent.offsetY - biasTop) / spzRealZoom;
          $data[groupIndex].values[dataIndex] = [
            $xScale.invert(x),
            $yScale.invert(y)
          ];
        }
      ) :
      $data[groupIndex].editable == 'x' ? (
        moveEvent => {
          const x = (moveEvent.offsetX - biasLeft) / spzRealZoom;
          $data[groupIndex].values[dataIndex][0] = $xScale.invert(x);
          /*
          $data[groupIndex].values[dataIndex] = [
            $xScale.invert(x),
            $yScale.invert(y)
          ];
          */
        }
      ) :
      $data[groupIndex].editable == 'y' ? (
        moveEvent => {
          const y = (moveEvent.offsetY - biasTop) / spzRealZoom;
          $data[groupIndex].values[dataIndex][1] = $yScale.invert(y);
        }
      ) :
      null
    );

    const stopMove = (stopEvent) => {
      document.removeEventListener('mousemove', moveMouse);
      document.removeEventListener('mouseup', stopMove);
      //document.removeEventListener('mouseleave', stopMove); // TODO
      dispatchEvent('editStop');
      
      // too complex
      //handleMouseOut({ target: startEvent.target }, true);
      //stopHover = false;
    };
    document.addEventListener('mouseup', stopMove);
    //document.addEventListener('mouseleave', stopMove); // TODO

    // start moving
    document.addEventListener('mousemove', moveMouse);
  }



  // too complex
  //let stopHover = false;
  function handleMouseOver({ target }) {
    // too complex
    //if (stopHover && !force) return;
    const s = parseFloat(target.attributes.width.value);
    target.setAttribute('transform', `translate(${-0.5 * s},${-0.5 * s})`);
    target.setAttribute('width', 2*s);
    target.setAttribute('height', 2*s);
  }

  //function handleMouseOut({ target }, force = false) {
  function handleMouseOut({ target }) {
    // too complex
    //if (stopHover && !force) return;
    const s = parseFloat(target.attributes.width.value);
    target.setAttribute('transform', '');
    target.setAttribute('width', 0.5*s);
    target.setAttribute('height', 0.5*s);
  }



</script>

<!-- broken:
          fill={$zGet(group)}
-->

<g class="multi-scatter-group" style="--hover-radius: {rHover}">
  {#each $data as group, gId}
    <g class="scatter-group" class:editable={Boolean(group.editable)}>
      {#if group.editable}
        <g transform="translate({-1 * r}, {-1 * r})"><!-- center rect-s -->
          {#each group.values as d, dId}
            {#if !isNaN($y(d)) && isFinite($y(d))}
              <rect
                x={$xGet(d)}
                y={$yGet(d)}
                width={rDouble}
                height={rDouble}
                fill={group.stroke}
                on:mousedown={event => handleMouseDown(event, gId, dId)}

                on:mouseover={handleMouseOver}
                on:mouseout={handleMouseOut}
              >
                <title>{group.key} ({$x(d)}) = {Number(($y(d) || NaN).toFixed(2))}</title><!-- tooltip -->
              </rect>
            {/if}
          {/each}
        </g>
      {:else}
        {#each group.values as d, dId}
          {#if !isNaN($y(d)) && isFinite($y(d))}
            <circle
              cx={$xGet(d)}
              cy={$yGet(d)}
              {r}
              fill={group.stroke}
              stroke={group.stroke}
              stroke-width="0"
            >
              <title>{group.key} ({$x(d)}) = {Number(($y(d) || NaN).toFixed(2))}</title><!-- tooltip -->
            </circle>
          {/if}
        {/each}
      {/if}
    </g>
  {/each}
</g>

<style>

  .scatter-group.editable circle:hover {
    r: var(--hover-radius);
  }

  /* workaround. in css, we cannot set a rect's width and height */
  /*
  rect:hover {
    stroke-width: 20 !important;

    fill: red !important;
  }
  */

</style>
