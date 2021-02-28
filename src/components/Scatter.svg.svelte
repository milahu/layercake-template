<script>
  import { getContext } from 'svelte';

  const { config, data, x, y, xGet, yGet, xSet, ySet, xScale, yScale, padding } = getContext('LayerCake');

  export let r = 5;
  export let fill = '#000';
  export let stroke = '#0cf';
  export let strokeWidth = 0;
  export let dx = 0;
  export let dy = 0;

  export let editable = false;

  function handleMouseDown(startEvent, dataIndex, d, xgetd) {
    const moveMouse = (moveEvent) => {
      // https://github.com/d3/d3-scale#continuous_invert
      $data[dataIndex] = {
        // limitation: only works if $config.x and $config.y are strings. see https://github.com/mhkeller/layercake/issues/38
        [$config.x]: $xScale.invert(moveEvent.offsetX - $padding.left),
        [$config.y]: $yScale.invert(moveEvent.offsetY - $padding.top)
      };
    };
    const stopMove = (stopEvent) => {
      document.removeEventListener('mousemove', moveMouse);
      document.removeEventListener('mouseup', stopMove);
      //document.removeEventListener('mouseleave', stopMove); // TODO
    };
    document.addEventListener('mouseup', stopMove);
    //document.addEventListener('mouseleave', stopMove); // TODO

    // start moving
    document.addEventListener('mousemove', moveMouse);
  }

</script>

<g class="scatter-group" class:editable={editable}>
  {#each $data as d, dIdx}
    <!--{#if d && $x(d) != null}-->
      <circle
        cx={$xGet(d) + (typeof dx === 'function' ? dx($xScale) : dx)}
        cy={$yGet(d) + (typeof dy === 'function' ? dy($yScale) : dy)}
        {r}
        {fill}
        {stroke}
        stroke-width={strokeWidth}
        on:mousedown={editable && (event => handleMouseDown(event, dIdx, d, $xGet(d)))}
      />
    <!--{/if}-->
  {/each}
</g>

<style>

  .scatter-group.editable circle:hover {
    fill: red !important;
  }

</style>
