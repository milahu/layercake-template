<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, zGet, xScale, yScale, xRange, yRange, xDomain, yDomain } = getContext('LayerCake');

	export let strokeWidth = 3;

	$: path = group => {
		if (group.values.length == 0) {
			//console.log('no values in group', group);
			return '';
		}
		return 'M' + group.values
			.map(d => {
				const xVal = $xGet(d);
				const yVal = $yGet(d);
				if (isNaN(xVal) || isNaN(yVal)) return '0,0'; // TODO better
				return xVal + ',' + yVal;
			})
			.join('L');
	};
</script>


<!-- broken:
			stroke="{$zGet(group)}"
-->

<g class="line-group" style="
	--stroke-width: {strokeWidth}px;
">
	{#each $data as group}
		<path
			class='path-line'
			d='{path(group)}'
			stroke="{group.stroke}"
		>
			<title>{group.key}</title><!-- tooltip -->
		</path>
	{/each}
</g>

<style>
	.path-line {
		stroke-width: var(--stroke-width);
		stroke: black;
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
</style>
