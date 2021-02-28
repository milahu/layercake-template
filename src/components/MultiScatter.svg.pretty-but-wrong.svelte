<script>
  import { getContext, createEventDispatcher } from 'svelte';

  const { config, data, x, y, xGet, yGet, zGet, xScale, yScale, padding,
    custom, extents, domain, width, height, reverse, range, percentScale } = getContext('LayerCake');

  const dispatchEvent = createEventDispatcher();

  const { svgPanZoomInstance } = $custom;
  //$: svgPanZoomInstance = $svgPanZoomInstance_store;

  export let r = 5;
  $: rDouble = 2 * r;

  export let rHover = 10;

  //export let editable = false;

  function handleMouseDown(startEvent, groupIndex, dataIndex) {
    dispatchEvent('editStart');
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

    // cache values to move faster

    const biasLeft = $padding.left*spzRealZoom + spzPanX;
    const biasTop = $padding.top*spzRealZoom + spzPanY;

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
    };
    document.addEventListener('mouseup', stopMove);
    //document.addEventListener('mouseleave', stopMove); // TODO

    // start moving
    document.addEventListener('mousemove', moveMouse);
  }



  function groupValues(group) {
    return group.values
      .map((d, dId) => ({
        d,
        dId,

        // FIXME positions
        xPos: $xGet(d),
        yPos: $yGet(d),

        xVal: $x(d),
        yVal: Number(($y(d) || NaN).toFixed(2)),
        color: group.stroke,
      }))
      .filter(({ xPos, yPos }) => !isNaN(xPos) && !isNaN(yPos))
    ;
  }



  // workaround. we cannot set css width and height for rect:hover
  function handleMouseOver({ target }) {
    const s = parseFloat(target.attributes.width.value);
    target.setAttribute('transform', `translate(${-0.5 * s},${-0.5 * s})`);
    target.setAttribute('width', 2*s);
    target.setAttribute('height', 2*s);
  }

  function handleMouseOut({ target }) {
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
        <!-- translate to center rect-s -->
        <g transform="translate({-1 * r}, {-1 * r})">
          {#each groupValues(group) as { d, dId, xPos, yPos, xVal, yVal, color }}
            <rect
              x={xPos}
              y={yPos}
              width={rDouble}
              height={rDouble}
              fill={color}
              stroke={color}
              stroke-width="0"
              on:mousedown={event => handleMouseDown(event, gId, dId)}
              on:mouseover={handleMouseOver}
              on:mouseout={handleMouseOut}
            >
              <!-- tooltip -->
              <title>{group.key} ({xVal}) = {yVal}</title>
            </rect>
          {/each}
        </g>
      {:else}
        {#each groupValues(group) as { d, dId, xPos, yPos, xVal, yVal, color }}
          <circle
            cx={xPos}
            cy={yPos}
            {r}
            fill={color}
            stroke={color}
            stroke-width="0"
          >
            <!-- tooltip -->
            <title>{group.key} ({xVal}) = {yVal}</title>
          </circle>
        {/each}
      {/if}
    </g>
  {/each}
</g>

<style>
  .scatter-group.editable circle:hover {
    r: var(--hover-radius);
  }
</style>
