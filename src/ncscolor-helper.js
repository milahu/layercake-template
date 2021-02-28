import ncsColor from 'ncs-color'; // https://github.com/m90/ncs-color
import colorConvert from 'color-convert'; // https://github.com/Qix-/color-convert

// analysis
// blackness has a perfectly linear relation to rgb across all hues.
//   blackness zero = maximal rgb values
//   blackness full = minimal rgb values
// chromaticness and hue look approximated with quadratic or cubic curves
// hue:
//   around blue there is the most unsteadiness
//   this is either a bad choice in algorithm
//   or this is on purpose, to scale the rgb color wheel in a very nonlinear way
//   the sharp edge at 180/400 (=160/360) degrees should be intentional,
//   cos there (green-blue-green) is cyan at 180/360
//   which is the opposite of red in the rgb color wheel

// normalization factors are hidden around line 400
// ideally these would be editable from the user interface



export function ncsData({ xDomain, blackness, chromaticness, normalize }) {
  console.log(`ncsData `+JSON.stringify({ xDomain, blackness, chromaticness, normalize }))
  if (xDomain == 'hue') return ncsDataByHue({ blackness, chromaticness, normalize });
  if (xDomain == 'blackness') return ncsDataByBlackness({ chromaticness, normalize });
  if (xDomain == 'chromaticness') return ncsDataByChromaticness({ blackness, normalize });
  return [];
}

function ncsHueOfDegrees(d) {
  // full circle = 400 degrees
  const phi = d % 100;
  if (d ==   0) return 'R';         // red
  if (d <  100) return 'R'+phi+'B'; // red    + phi * blue
  if (d == 100) return 'B';         // blue
  if (d <  200) return 'B'+phi+'G'; // blue   + phi * green
  if (d == 200) return 'G';         // green
  if (d <  300) return 'G'+phi+'Y'; // green  + phi * yellow
  if (d == 300) return 'Y';         // yellow
  if (d <  400) return 'Y'+phi+'R'; // yellow + phi * red
  if (d <= 400) return 'R';         // red
}

// precision
const colorDegreesStep = 1;
const chromaticnessStep = 5;
const blacknessStep = 5;

function pad2(n) {
  return ("00"+n).slice(-2);
}

const skip_radius_low = 11; // algorithm is broken at the four primary colors (hue.phi +-10%)
const skip_radius_upp = 11; // algorithm is broken at the four primary colors (hue.phi +-10%)

// modulo for negative numbers
Number.prototype.mod = function(n) {
  return ((this%n)+n)%n;
};



// warning: lots of spaghetti code down here ... feel free to refactor : P

function ncsDataByBlackness({ chromaticness }) {

  if (chromaticness == undefined) chromaticness = 99;
  if (chromaticness < 0) chromaticness = 0;
  if (chromaticness > 99) chromaticness = 99;

  // min/max values over all hues

  const [

    k_rgb_r_min, k_rgb_r_max,
    k_rgb_g_min, k_rgb_g_max,
    k_rgb_b_min, k_rgb_b_max,

    //k_hsv_h_min, k_hsv_h_max, // always 0 : 360
    k_hsv_s_min, k_hsv_s_max,
    k_hsv_v_min, k_hsv_v_max,

    //k_hsl_h_min, k_hsl_h_max, // always 0 : 360
    k_hsl_s_min, k_hsl_s_max,
    k_hsl_l_min, k_hsl_l_max,

  ] = Array.from({ length: 100 }).map((_, i) => i);

  const res = [];

  res[k_rgb_r_min] = { values: [], key: 'rgb_r_min', stroke: 'red' };
  res[k_rgb_g_min] = { values: [], key: 'rgb_g_min', stroke: 'green' };
  res[k_rgb_b_min] = { values: [], key: 'rgb_b_min', stroke: 'blue' };

  res[k_rgb_r_max] = { values: [], key: 'rgb_r_max', stroke: 'red' };
  res[k_rgb_g_max] = { values: [], key: 'rgb_g_max', stroke: 'green' };
  res[k_rgb_b_max] = { values: [], key: 'rgb_b_max', stroke: 'blue' };

  //res[k_hsv_h_min] = { values: [], key: 'hsv_h_min', stroke: 'black' };
  res[k_hsv_s_min] = { values: [], key: 'hsv_s_min', stroke: 'orange' };
  res[k_hsv_v_min] = { values: [], key: 'hsv_v_min', stroke: '#ff00ff' }; // red-blue

  //res[k_hsv_h_max] = { values: [], key: 'hsv_h_max', stroke: 'black' };
  res[k_hsv_s_max] = { values: [], key: 'hsv_s_max', stroke: 'orange' };
  res[k_hsv_v_max] = { values: [], key: 'hsv_v_max', stroke: '#ff00ff' }; // red-blue

  //res[k_hsl_h_min] = { values: [], key: 'hsl_h_min', stroke: 'black' };
  res[k_hsl_s_min] = { values: [], key: 'hsl_s_min', stroke: '#00ffff' }; // blue-green
  res[k_hsl_l_min] = { values: [], key: 'hsl_l_min', stroke: '#00ffff' }; // blue-green

  //res[k_hsl_h_max] = { values: [], key: 'hsl_h_max', stroke: 'black' };
  res[k_hsl_s_max] = { values: [], key: 'hsl_s_max', stroke: '#00ffff' }; // blue-green
  res[k_hsl_l_max] = { values: [], key: 'hsl_l_max', stroke: '#00ffff' }; // blue-green

  for (let blackness = 0; blackness <= 100; blackness += blacknessStep) {

    if (blackness == 100) blackness = 99; // algos fail on blackness 100

    const nuance = pad2(blackness) + pad2(chromaticness);

    const temp_res = [];

    for (let colorDegreesFull = 0; colorDegreesFull < 400; colorDegreesFull += colorDegreesStep) {

      const colorDegrees = colorDegreesFull.mod(400);
      if (
                                                colorDegrees <   0+skip_radius_upp  ||
        (-skip_radius_low+100 < colorDegrees && colorDegrees < 100+skip_radius_upp) ||
        (-skip_radius_low+200 < colorDegrees && colorDegrees < 200+skip_radius_upp) ||
        (-skip_radius_low+300 < colorDegrees && colorDegrees < 300+skip_radius_upp) ||
         -skip_radius_low+400 < colorDegrees
      ) {
        //console.log(`skip ${colorDegreesFull}`);
        //res.push( [ null, null, null ] );
        continue;
      }

      const ncs = pad2(blackness) + pad2(chromaticness) + '-' + ncsHueOfDegrees(colorDegrees);

      const rgbStr = ncsColor.rgb('NCS '+ncs);

      const [, r, g, b] = rgbStr.match(/rgb\((\d+),([\d.]+),([\d.]+)\)/).map(s => parseInt(s));
      const rgb = [r, g, b];

      const hsl = colorConvert.rgb.hsl(r, g, b); // 0 <= rgb <= 255
      const hsv = colorConvert.rgb.hsv(r, g, b); // 0 <= rgb <= 255

      temp_res.push({ rgb, hsl, hsv });
    }

    // find min/max
    // (yes i know this is ugly code ...)
    res[k_rgb_r_min].values.push([ blackness, Math.min(...temp_res.map(p => p.rgb[0])) ]);
    res[k_rgb_g_min].values.push([ blackness, Math.min(...temp_res.map(p => p.rgb[1])) ]);
    res[k_rgb_b_min].values.push([ blackness, Math.min(...temp_res.map(p => p.rgb[2])) ]);

    res[k_rgb_r_max].values.push([ blackness, Math.max(...temp_res.map(p => p.rgb[0])) ]);
    res[k_rgb_g_max].values.push([ blackness, Math.max(...temp_res.map(p => p.rgb[1])) ]);
    res[k_rgb_b_max].values.push([ blackness, Math.max(...temp_res.map(p => p.rgb[2])) ]);

    //res[k_hsv_h_min].values.push([ blackness, Math.min(...temp_res.map(p => p.hsv[0])) ]);
    res[k_hsv_s_min].values.push([ blackness, Math.min(...temp_res.map(p => p.hsv[1])) ]);
    res[k_hsv_v_min].values.push([ blackness, Math.min(...temp_res.map(p => p.hsv[2])) ]);

    //res[k_hsv_h_max].values.push([ blackness, Math.max(...temp_res.map(p => p.hsv[0])) ]);
    res[k_hsv_s_max].values.push([ blackness, Math.max(...temp_res.map(p => p.hsv[1])) ]);
    res[k_hsv_v_max].values.push([ blackness, Math.max(...temp_res.map(p => p.hsv[2])) ]);

    //res[k_hsl_h_min].values.push([ blackness, Math.min(...temp_res.map(p => p.hsl[0])) ]);
    res[k_hsl_s_min].values.push([ blackness, Math.min(...temp_res.map(p => p.hsl[1])) ]);
    res[k_hsl_l_min].values.push([ blackness, Math.min(...temp_res.map(p => p.hsl[2])) ]);

    //res[k_hsl_h_max].values.push([ blackness, Math.max(...temp_res.map(p => p.hsl[0])) ]);
    res[k_hsl_s_max].values.push([ blackness, Math.max(...temp_res.map(p => p.hsl[1])) ]);
    res[k_hsl_l_max].values.push([ blackness, Math.max(...temp_res.map(p => p.hsl[2])) ]);
  }
  return res;
}



function ncsDataByChromaticness({ blackness }) {
  if (blackness == undefined) blackness = 0;
  if (blackness < 0) blackness = 0;
  if (blackness > 99) blackness = 99;

  // only show min/max values over all hues

  const [

    k_rgb_r_min, k_rgb_r_max,
    k_rgb_g_min, k_rgb_g_max,
    k_rgb_b_min, k_rgb_b_max,

    //k_hsv_h_min, k_hsv_h_max, // always 0 : 360
    k_hsv_s_min, k_hsv_s_max,
    k_hsv_v_min, k_hsv_v_max,

    //k_hsl_h_min, k_hsl_h_max, // always 0 : 360
    k_hsl_s_min, k_hsl_s_max,
    k_hsl_l_min, k_hsl_l_max,

  ] = Array.from({ length: 100 }).map((_, i) => i);

  const res = [];

  res[k_rgb_r_min] = { values: [], key: 'rgb_r_min', stroke: 'red' };
  res[k_rgb_g_min] = { values: [], key: 'rgb_g_min', stroke: 'green' };
  res[k_rgb_b_min] = { values: [], key: 'rgb_b_min', stroke: 'blue' };

  res[k_rgb_r_max] = { values: [], key: 'rgb_r_max', stroke: 'red' };
  res[k_rgb_g_max] = { values: [], key: 'rgb_g_max', stroke: 'green' };
  res[k_rgb_b_max] = { values: [], key: 'rgb_b_max', stroke: 'blue' };

  //res[k_hsv_h_min] = { values: [], key: 'hsv_h_min', stroke: 'black' };
  res[k_hsv_s_min] = { values: [], key: 'hsv_s_min', stroke: 'orange' };
  res[k_hsv_v_min] = { values: [], key: 'hsv_v_min', stroke: '#ff00ff' }; // red-blue

  //res[k_hsv_h_max] = { values: [], key: 'hsv_h_max', stroke: 'black' };
  res[k_hsv_s_max] = { values: [], key: 'hsv_s_max', stroke: 'orange' };
  res[k_hsv_v_max] = { values: [], key: 'hsv_v_max', stroke: '#ff00ff' }; // red-blue

  //res[k_hsl_h_min] = { values: [], key: 'hsl_h_min', stroke: 'black' };
  res[k_hsl_s_min] = { values: [], key: 'hsl_s_min', stroke: '#00ffff' }; // blue-green
  res[k_hsl_l_min] = { values: [], key: 'hsl_l_min', stroke: '#00ffff' }; // blue-green

  //res[k_hsl_h_max] = { values: [], key: 'hsl_h_max', stroke: 'black' };
  res[k_hsl_s_max] = { values: [], key: 'hsl_s_max', stroke: '#00ffff' }; // blue-green
  res[k_hsl_l_max] = { values: [], key: 'hsl_l_max', stroke: '#00ffff' }; // blue-green

  for (let chromaticness = 0; chromaticness <= 100; chromaticness += chromaticnessStep) {

    if (chromaticness == 100) chromaticness = 99; // algos fail on chromaticness 100

    const nuance = pad2(blackness) + pad2(chromaticness);

    const temp_res = [];

    for (let colorDegreesFull = 0; colorDegreesFull < 400; colorDegreesFull += colorDegreesStep) {

      const colorDegrees = colorDegreesFull.mod(400);
      if (
                                                colorDegrees <   0+skip_radius_upp  ||
        (-skip_radius_low+100 < colorDegrees && colorDegrees < 100+skip_radius_upp) ||
        (-skip_radius_low+200 < colorDegrees && colorDegrees < 200+skip_radius_upp) ||
        (-skip_radius_low+300 < colorDegrees && colorDegrees < 300+skip_radius_upp) ||
         -skip_radius_low+400 < colorDegrees
      ) {
        //console.log(`skip ${colorDegreesFull}`);
        //res.push( [ null, null, null ] );
        continue;
      }

      const ncs = pad2(blackness) + pad2(chromaticness) + '-' + ncsHueOfDegrees(colorDegrees);

      const rgbStr = ncsColor.rgb('NCS '+ncs);

      const [, r, g, b] = rgbStr.match(/rgb\((\d+),([\d.]+),([\d.]+)\)/).map(s => parseInt(s));
      const rgb = [r, g, b];

      const hsl = colorConvert.rgb.hsl(r, g, b); // 0 <= rgb <= 255
      const hsv = colorConvert.rgb.hsv(r, g, b); // 0 <= rgb <= 255

      temp_res.push({ rgb, hsl, hsv });
    }

    // find min/max
    // (yes i know this is ugly code ...)
    res[k_rgb_r_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.rgb[0])) ]);
    res[k_rgb_g_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.rgb[1])) ]);
    res[k_rgb_b_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.rgb[2])) ]);

    res[k_rgb_r_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.rgb[0])) ]);
    res[k_rgb_g_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.rgb[1])) ]);
    res[k_rgb_b_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.rgb[2])) ]);

    //res[k_hsv_h_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.hsv[0])) ]);
    res[k_hsv_s_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.hsv[1])) ]);
    res[k_hsv_v_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.hsv[2])) ]);

    //res[k_hsv_h_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.hsv[0])) ]);
    res[k_hsv_s_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.hsv[1])) ]);
    res[k_hsv_v_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.hsv[2])) ]);

    //res[k_hsl_h_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.hsl[0])) ]);
    res[k_hsl_s_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.hsl[1])) ]);
    res[k_hsl_l_min].values.push([ chromaticness, Math.min(...temp_res.map(p => p.hsl[2])) ]);

    //res[k_hsl_h_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.hsl[0])) ]);
    res[k_hsl_s_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.hsl[1])) ]);
    res[k_hsl_l_max].values.push([ chromaticness, Math.max(...temp_res.map(p => p.hsl[2])) ]);
  }
  return res;
}



function ncsDataByHue({ blackness, chromaticness, normalize }) {

  if (blackness == undefined) blackness = 0;
  if (blackness < 0) blackness = 0;
  if (blackness > 99) blackness = 99;

  if (chromaticness == undefined) chromaticness = 99;
  if (chromaticness < 0) chromaticness = 0;
  if (chromaticness > 99) chromaticness = 99;

  const [
    k_rgb_r, k_rgb_g, k_rgb_b,
    k_hsv_h, k_hsv_s, k_hsv_v,
    k_hsl_h, k_hsl_s, k_hsl_l,
  ] = Array.from({ length: 100 }).map((_, i) => i);

  const res = [];

  res[k_rgb_r] = { values: [], key: 'rgb_r', stroke: 'red' };
  res[k_rgb_g] = { values: [], key: 'rgb_g', stroke: 'green' };
  res[k_rgb_b] = { values: [], key: 'rgb_b', stroke: 'blue' };

  res[k_hsv_h] = { values: [], key: 'hsv_h', stroke: 'black' };
  res[k_hsv_s] = { values: [], key: 'hsv_s', stroke: 'orange' };
  res[k_hsv_v] = { values: [], key: 'hsv_v', stroke: '#ff00ff' }; // red-blue

  res[k_hsl_h] = { values: [], key: 'hsl_h', stroke: 'black' };
  res[k_hsl_s] = { values: [], key: 'hsl_s', stroke: '#00ffff' }; // blue-green
  res[k_hsl_l] = { values: [], key: 'hsl_l', stroke: '#00ffff' }; // blue-green

  const nuance = pad2(blackness) + pad2(chromaticness);

  let last_h = null;
  let bias_h = 0;

  // we plot more than full circle (400 degrees) to see the circular symmetry
  const colorDegreesFullMax = 500;
  for (let colorDegreesFull = -100; colorDegreesFull <= colorDegreesFullMax; colorDegreesFull += colorDegreesStep) {

    const colorDegrees = colorDegreesFull.mod(400);
    if (
                                              colorDegrees <   0+skip_radius_upp  ||
      (-skip_radius_low+100 < colorDegrees && colorDegrees < 100+skip_radius_upp) ||
      (-skip_radius_low+200 < colorDegrees && colorDegrees < 200+skip_radius_upp) ||
      (-skip_radius_low+300 < colorDegrees && colorDegrees < 300+skip_radius_upp) ||
       -skip_radius_low+400 < colorDegrees
    ) {
      //console.log(`skip ${colorDegreesFull}`);
      //res.push( [ null, null, null ] );
      continue;
    }

    const ncs = pad2(blackness) + pad2(chromaticness) + '-' + ncsHueOfDegrees(colorDegrees);

    const rgbStr = ncsColor.rgb('NCS '+ncs);

    const [, r, g, b] = rgbStr.match(/rgb\((\d+),([\d.]+),([\d.]+)\)/).map(s => parseInt(s));
    const rgb = [r, g, b];

    const hsl = colorConvert.rgb.hsl(r, g, b); // 0 <= rgb <= 255
    const hsv = colorConvert.rgb.hsv(r, g, b); // 0 <= rgb <= 255

    let h = hsl[0];
    //let h = hsv[0];
    // same? why different formula for hsl.h vs hsv.h?

    //res.push([ colorDegrees/400*360, hsl[0], hsv[0] ]);
    const deg360 = colorDegrees/400*360;
    const deg360Full = colorDegreesFull/400*360;

    if (last_h != null) {
      let diff_h = h - last_h;
      if (diff_h < -180 || 180 < diff_h) {
        // overflow between 4 and 356
        //console.log(`overflow between ${last_h} and ${h}`)
        //bias_h = bias_h - 360;
      }
    }
    last_h = h;
    h = bias_h + h;

    //res.push([ deg360Full, (360-h - deg360) ]);
    //res.push([ colorDegreesFull, (360-h - deg360) ]); // periodic hue
    //res.push({ deg: colorDegreesFull, rgb, hsv, hsl }); // periodic hue

    //console.log(`push ${colorDegreesFull}. len = ${res[k_rgb_r].values.length}`);

    //const scale_rgb = (100 / (100 - blackness)) * (100 + (chromaticness - 100)*(70 - 100)/(45 - 100));

    /*

    const scale_rgb = 1 + (100 - chromaticness)/65; // nonlinear?
    const offset_rgb = -0.8*(100 - chromaticness);

    const scale_hsl_l = 100 / (100 - blackness);
    const offset_hsl_l = blackness * 1.057;

    //const scale_hsl_s = 1 + (100 - chromaticness)/45; // nonlinear?
    const scale_hsl_s = 6;
    const offset_hsl_s = -111;

    */

    let offset_rgb = 0;
    let scale_rgb = 1;

    let offset_hsv_s = 0;
    let scale_hsv_s = 1;

    let offset_hsl_l = 0;
    let scale_hsl_l = 1;

    let offset_hsl_h = 0;
    let scale_hsl_h = 1;

    let offset_hsl_s = 0;
    let scale_hsl_s = 1;

    if (normalize) {
      //offset_rgb = 0;
      scale_rgb = (
        (100/268) * // TODO why not 100/255? bug in plot scale?
        (100 / (100 - blackness)) // perfectly linear relation? nonlinear for high blackness?
      );

      // 100-hsv[1] = (hsv[1] -100)*-1
      offset_hsv_s = -100;
      scale_hsv_s = -1;

      offset_hsl_l = -53;
      scale_hsl_l = 2;

      //offset_hsl_h = deg360-360+10;
      //scale_hsl_h = -1.3;
      //offset_hsl_h = deg360;
      offset_hsl_h = deg360-295;
      //scale_hsl_h = -1.3;
      scale_hsl_h = +1.366;

      offset_hsl_s = -111;
      //scale_hsl_s = 1 + (100 - chromaticness)/45; // nonlinear?
      scale_hsl_s = 6;
    }

    res[k_rgb_r].values.push([ colorDegreesFull, (rgb[0] + offset_rgb) * scale_rgb ]);
    res[k_rgb_g].values.push([ colorDegreesFull, (rgb[1] + offset_rgb) * scale_rgb ]);
    res[k_rgb_b].values.push([ colorDegreesFull, (rgb[2] + offset_rgb) * scale_rgb ]);

    //res[k_hsv_h].values.push([ colorDegreesFull, (360-hsv[0] - deg360) ]); // exact same as hsl
    res[k_hsv_s].values.push([ colorDegreesFull, (hsv[1] + offset_hsv_s) * scale_hsv_s ]);
    //res[k_hsv_v].values.push([ colorDegreesFull, hsv[2] ]); // constant!

    //res[k_hsl_h].values.push([ (colorDegreesFullMax - colorDegreesFull), (hsl[0] + offset_hsl_h) * scale_hsl_h ]);
    res[k_hsl_h].values.push([ colorDegreesFull, (hsl[0] + offset_hsl_h) * scale_hsl_h ]);
    res[k_hsl_s].values.push([ colorDegreesFull, (hsl[1] + offset_hsl_s) * scale_hsl_s ]);
    res[k_hsl_l].values.push([ colorDegreesFull, (hsl[2] + offset_hsl_l) * scale_hsl_l ]);

    

    //res.push([ colorDegreesFull, r ]);

    //res.push([ deg360, h ]);
    //res.push([ deg360, -deg360+hsl[0] ]);
  }
  //  }
  //}

  //console.dir(res);

  return res;
}



if (false) {
  // color-convert/conversions.js

  convert.rgb.hsl = function (rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const delta = max - min;
    let h;
    let s;

    if (max === min) {
      h = 0;
    } else if (r === max) {
      h = (g - b) / delta;
    } else if (g === max) {
      h = 2 + (b - r) / delta;
    } else if (b === max) {
      h = 4 + (r - g) / delta;
    }

    h = Math.min(h * 60, 360);

    if (h < 0) {
      h += 360;
    }

    const l = (min + max) / 2;

    if (max === min) {
      s = 0;
    } else if (l <= 0.5) {
      s = delta / (max + min);
    } else {
      s = delta / (2 - max - min);
    }

    return [h, s * 100, l * 100];
  };



  convert.rgb.hsv = function (rgb) {
    let rdif;
    let gdif;
    let bdif;
    let h;
    let s;

    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const v = Math.max(r, g, b);
    const diff = v - Math.min(r, g, b);
    const diffc = function (c) {
      return (v - c) / 6 / diff + 1 / 2;
    };

    if (diff === 0) {
      h = 0;
      s = 0;
    } else {
      s = diff / v;
      rdif = diffc(r);
      gdif = diffc(g);
      bdif = diffc(b);

      if (r === v) {
        h = bdif - gdif;
      } else if (g === v) {
        h = (1 / 3) + rdif - bdif;
      } else if (b === v) {
        h = (2 / 3) + gdif - rdif;
      }

      if (h < 0) {
        h += 1;
      } else if (h > 1) {
        h -= 1;
      }
    }

    return [
      h * 360,
      s * 100,
      v * 100
    ];
  };

}

