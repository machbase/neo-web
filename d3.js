/*!
 * Copyright of this product 2013-2023,
 * MACHBASE Corporation(or Inc.) or its subsidiaries.
 * All Rights reserved.
 *
 * Required to include d3.js before machIoTtimeline.js.
 */

var gD3ColorSetName = [
    { name: 'schemeCategory10', n: 10 },
    { name: 'schemeCategory20', n: 20 },
    { name: 'schemeCategory20b', n: 20 },
    { name: 'schemeCategory20c', n: 20 },
];
//var gMachbaseColorSet = '5ca3f2,7070e0,86b66b,d06a5f,e2bb5c,a673e8,6bcbc1,e26daf,bac85d,87cedd';
var gMachbaseColorSet = '5ca3f2,d06a5f,e2bb5c,86b66b,7070e0,6bcbc1,a673e8,e26daf,bac85d,87cedd';
var gTooltipMargin = 20;
var gMargin = { top: 15, bottom: 30, left: 40, right: 20, y2_right: 24, y2_left: 40 }; // y2_right : width adjustment for right y2 axis.
var gLegendRightMargin = 10;
var gLegendBottomHeight = 29; // 14(text height) + 15(padding bottom)
var gTimeRangeSet = { begin: '', end: '' }; // result set for getMinMaxDate()

function machIoTtimechart() {
    //////////////// Define Chart Variables (begin) /////////////////////
    var gMainDiv = '';
    var gTargetDiv = '';
    var gSelectedX = { start: 0, end: 0 };
    var gDragged = false;
    var gParams = {};
    var gChartMode = 'V';
    var gRow = -1;
    var gCol = -1;
    var gWheeled = 0; // 0: not in wheel event, 1: zoom in wheel, 2: zoom out wheel
    var gGenerateBgn = null; // store generateData() time range.
    var gGenerateEnd = null; // store generateData() time range.
    var gSeriesName = []; // generate in setVars() using gTagSets for gZ() series color.
    var gSkipDataWork = false; // Skip generate data on vport move event.
    var gClickedName = ''; // clicked legend (series name)
    var gClickedAxis = ''; // clicked axis (axis class name)

    var gUseNormalize = 'N';
    var gWeight = [];
    var gAlias = [];
    var gMinArr = [];
    var gMaxArr = [];

    var gX = null;
    var gY = null;
    var gY2 = null;
    var gZ = null;
    var gAreaGen = null;
    var gLineGen = null;
    var gXaxisCall = null;
    var gYaxisCall = null;
    var gYaxisCall2 = null;
    var gDrag = null;

    var gSvg = null;
    var gG = null;

    var gXaxis = null;
    var gYaxis = null;
    var gYaxis2 = null;
    var gAreas = null;
    var gArea = null;
    var gSeries = null;
    var gSerie = null;
    var gPoints = null;
    var gFocus = null;

    var gVLine = null;
    var gDraged = null;
    var gTooltip = null;
    var gRect = null;

    var gVportHeight = null;
    var gVportInHeight = null;
    var gVportInnerWidth = null;
    var gVportWidth = null;

    var gXVport = null;
    var gYVport = null;
    var gYVport2 = null;
    var gLineGenVport = null;
    var gDiv = null;
    var gSvgVport = null;
    var gGVport = null;

    var gLineVport = null;
    var gViewport = null;
    var gBrushClick = false;

    var gMinY = 0;
    var gMaxY = 0;
    var gMinYUsed = 0;
    var gMaxYUsed = 0;
    var gMinY2 = 0;
    var gMaxY2 = 0;
    var gMinYUsed2 = 0;
    var gMaxYUsed2 = 0;
    var gUseY2Axis = false;
    var gTickFormat = null;
    var gY2Adjust = 0; // width adjustment for Y2
    var gY2LeftAdjust = 0; // left adjustment for Y2
    var gUseRightY2 = true;

    var gLastZoomData = { range_begin: '', range_end: '', vport_begin: -1, vport_end: -1 };
    var gCrntZoomData = { range_begin: '', range_end: '', vport_begin: -1, vport_end: -1 };
    var gInternalTimeRangeSet = { begin: '', end: '' }; // result set for getMinMaxDate()

    var gUseTagMinMax = false; // Get min/max by tag.
    var gRawDataThresholdSecond = 5000; // millisecond, RawDataChart when Time Range is less them this value. if this value == 0 then use count(gRawChartThreshold).
    //////////////// Define Chart Variables (end) ///////////////////////

    //////////////// Define Chart Data Variables (begin) ////////////////
    var parseTime = null; // d3.timeParse('%Y-%m-%d %H:%M:%S');
    var formatTime = null; // d3.timeFormat('%Y-%m-%d %H:%M:%S');
    var bisectDate = null; // d3.bisector(function(d) { return d.date; }).left;

    var gData = [];
    var gTempData = [];
    var gSeriesData = [];
    var gVPortSeries = [];
    var gIsDrilledChart = 0; // 0: rollup chart, 1: drill down chart, 2: raw data chart
    var gRawDataBaseTime = null;

    var gDetailData = [];
    var gCurrentPage = 1;
    var gProcess = 0; // for wait all ajax result.
    var gNow = new Date(); // for claculate date 'now'
    var gRefreshTimer = null; // Timer for refresh
    var gResizingWindow = false; // Resize window status flag
    //////////////// Define Chart Data Variables (end) //////////////////

    //////////////// Define Chart Setting Variables (begin) ////////////////
    var gChartId = ''; // use file name(can use alphanumeric & underscore & minus)
    var gDesc = ''; // chart description

    var gTagSets = [];
    var gTags = '';
    var gCols = ''; // not use
    var gBgnParam = '';
    var gEndParam = '';
    var gBgn = gBgnParam;
    var gEnd = gEndParam;
    var gLimitParam = -1;
    var gLimit = -1;
    var gUnit = '';
    var gUnitVal = 0;
    var gRefresh = '';

    var gChartTitle = '';
    var gCssType = '';
    var gFill = 0;
    var gStroke = 0;
    var gShowPoint = false;
    var gPointSize = 0;
    var gBorderColor = '';
    var gLegendWidthParam = 0;
    var gLegendWidth = gLegendWidthParam;
    var gNameLegendValue = []; // ['min', 'max', 'sum', 'avg']
    var gShowLegendValue = [];
    var gShowLegend = 'N'; // B(=bottom) / N(=not show) / R(=right, not use)
    var gRawChartLimitParam = -1; // -1: (chart width / 2), 0: chart width, >0: limit
    var gRawChartLimit = 0;
    var gRawChartThresholdParam = 0; // >1 : count, <1 : ratio of total count, =0 : total / count * 2, <0 : not use
    var gRawChartThreshold = 0;
    var gStartWithVPort = true;

    var gTickPixels = 0;
    var gZero = false;
    var gUseCustomMin = false;
    var gCustomMin = 0;
    var gUseCustomMax = false;
    var gCustomMax = 0;
    var gShowXAxisTickLine = false;
    var gUseY2 = [];
    var gShowYAxisTickLine = false;
    var gShowYAxisTickLine2 = false;
    var gZero2 = false;
    var gUseCustomMin2 = false;
    var gCustomMin2 = 0;
    var gUseCustomMax2 = false;
    var gCustomMax2 = 0;
    var gUseCustomDrillDownMin = false;
    var gCustomDrillDownMin = 0;
    var gUseCustomDrillDownMax = false;
    var gCustomDrillDownMax = 0;
    var gUseCustomDrillDownMin2 = false;
    var gCustomDrillDownMin2 = 0;
    var gUseCustomDrillDownMax2 = false;
    var gCustomDrillDownMax2 = 0;

    var gDetailLimit = 0;
    var gDetailRows = 0;
    var gUseDetail = 1; // on click point - 0: not use, 1: show raw data chart, 2: show raw data table
    var gUseZoom = false;
    var gDrillDownZoom = false;

    var gUseCustomColor = false;
    var gColorSet = '';
    var gChartType = 'line'; // reserved
    var gXAxisType = ''; // reserved

    var gHeightParam = 0;
    var gWidthParam = 0;
    var gHeight = 0;
    var gWidth = 0;
    var gTimeOut = 10000; // ajax timeout

    var gInnerWidth = 0;
    var gInnerHeight = 0;
    var gInterval = { type: gUnit, value: gUnitVal };

    var gServerInfo = { db_ip: '', db_port: '', db_user: '', db_pass: '', db_server: '', use_custom: 'N' }; // use_custom : I(p) | S(erver) | N(o)
    var gBgnChart = ''; // Begin date of the currently drawn chart
    var gEndChart = ''; // End date of the currently drawn chart
    var gChartInterval = { type: '', value: 0 };
    //////////////// Define Chart Setting Variables (end) ////////////////

    //////////////// functions for generate Chart settings (end) ////
    // *** setVars(aParams)
    // *** aParams : refer setting json ( http://intra.machbase.com:8888/pages/viewpage.action?pageId=201883696 )
    // *** need to calc chart_height & chart_width(setVars function does not calc width/height)
    // *** does not use refresh & chart_title
    this.setVars = function (aParams, aMode, aRow, aCol) {
        gParams = aParams;
        if (aMode == null) {
            gChartMode = 'E';
        } else {
            gChartMode = aMode;
        }
        if (aRow == null) {
            gRow = -1;
        } else {
            gRow = aRow;
        }
        if (aCol == null) {
            gCol = -1;
        } else {
            gCol = aCol;
        }

        if (gChartId == '' && aParams.hasOwnProperty('chart_id') && aParams.chart_id.trim() != '') {
            gChartId = aParams.chart_id.trim();
        }
        if (aParams.hasOwnProperty('description') && aParams.description.trim() != '') {
            gDesc = aParams.description.trim();
        } else {
            gDesc = '';
        }
        if (aParams.hasOwnProperty('use_normalize') && aParams.use_normalize.trim() != '') {
            gUseNormalize = aParams.use_normalize.trim();
        } else {
            gUseNormalize = 'N';
        }

        gTagSets = aParams.tag_set;
        if (gTagSets.length == 0) {
            gTags = '';
            gCols = ''; // not use
            gAlias = '';
            gWeight = [];
        } else {
            gTags = gTagSets[0].tag_names;
            gCols = gTagSets[0].calculation_mode.toLowerCase(); // not use
            gAlias = gTagSets[0].alias;
            gWeight = gTagSets[0].weight;
        }
        gBgnParam = aParams.range_bgn.trim().toLowerCase();
        gEndParam = aParams.range_end.trim().toLowerCase();
        gBgn = gBgnParam;
        gEnd = gEndParam;
        gLimitParam = aParams.count;
        gLimit = gLimitParam;
        gUnit = aParams.interval_type.toLowerCase();
        gUnitVal = aParams.interval_value;
        gRefresh = aParams.refresh.trim().toLowerCase();

        switch (gUnit) {
            case 's':
                gUnit = 'sec';
                break;
            case 'm':
                gUnit = 'min';
                break;
            case 'h':
                gUnit = 'hour';
                break;
            case 'd':
                gUnit = 'day';
                break;
        }

        gInterval = { type: gUnit, value: gUnitVal };

        gChartTitle = aParams.chart_title;
        gCssType = aParams.csstype;
        gFill = aParams.fill;
        gStroke = aParams.stroke;
        gShowPoint = aParams.show_point == 'Y';
        gPointSize = aParams.point_radius;
        gBorderColor = aParams.border_color.toUpperCase();
        gShowLegend = aParams.show_legend; // B(=bottom) / N(=not show) / R(=right, not use)
        gRawChartLimitParam = aParams.raw_chart_limit; // -1: (chart width / 2), 0: chart width, >0: limit
        gRawChartLimit = gRawChartLimitParam;
        gStartWithVPort = aParams.start_with_vport == 'Y';
        gRawChartThresholdParam = aParams.raw_chart_threshold; // >1 : count, <1 : ratio of total count, =0 : total / count * 2, <0 : not use
        gRawChartThreshold = gRawChartThresholdParam;
        if (gRawChartThresholdParam < 0) {
            gRawDataThresholdSecond = gRawChartThresholdParam * -1;
        } else if (gRawChartThresholdParam > 0) {
            gRawDataThresholdSecond = 0;
        }

        if (aParams.legend_width != '' && aParams.legend_width != null) {
            gLegendWidthParam = parseInt(aParams.legend_width);
        } else {
            gLegendWidthParam = 0;
        }
        if (gShowLegend != 'R') {
            gLegendWidthParam = 0;
            gLegendRightMargin = 0;
        }
        gLegendWidth = gLegendWidthParam + gLegendRightMargin;
        gNameLegendValue = aParams.name_legend_value; // ['min', 'max', 'sum', 'avg']
        gShowLegendValue = [];
        for (var i = 0; i < gNameLegendValue.length; i++) {
            var sName = gNameLegendValue[i];
            gShowLegendValue.push(aParams.show_legend_value[sName].toUpperCase() == 'Y');
        }
        if (gShowLegend == 'R' && gLegendWidthParam <= 0) {
            gMargin.right = 0;
        }
        //        else  // for Bottom Legend
        //        {
        //            gMargin.right = 15;
        //        }

        gTickPixels = aParams.pixels_per_tick;
        if (gTickPixels <= 0) gTickPixels = 1;

        gZero = aParams.zero_base.toUpperCase() == 'Y';
        gUseCustomMin = aParams.use_custom_min.toUpperCase() == 'Y';
        gCustomMin = aParams.custom_min;
        gUseCustomMax = aParams.use_custom_max.toUpperCase() == 'Y';
        gCustomMax = aParams.custom_max;
        gShowXAxisTickLine = aParams.hasOwnProperty('show_x_tickline') ? aParams.show_x_tickline.toUpperCase() == 'Y' : true;
        gZero2 = aParams.hasOwnProperty('zero_base2') ? aParams.zero_base2.toUpperCase() == 'Y' : false;
        gUseRightY2 = aParams.hasOwnProperty('use_right_y2') ? aParams.use_right_y2.toUpperCase() == 'Y' : false;
        gShowYAxisTickLine = aParams.hasOwnProperty('show_y_tickline') ? aParams.show_y_tickline.toUpperCase() == 'Y' : true;
        gShowYAxisTickLine2 = aParams.hasOwnProperty('show_y_tickline2') ? aParams.show_y_tickline2.toUpperCase() == 'Y' : true;
        gUseCustomMin2 = aParams.hasOwnProperty('use_custom_min2') ? aParams.use_custom_min2.toUpperCase() == 'Y' : false;
        gCustomMin2 = aParams.hasOwnProperty('custom_min2') ? aParams.custom_min2 : 0;
        gUseCustomMax2 = aParams.hasOwnProperty('use_custom_max2') ? aParams.use_custom_max2.toUpperCase() == 'Y' : false;
        gCustomMax2 = aParams.hasOwnProperty('custom_max2') ? aParams.custom_max2 : 0;
        gUseCustomDrillDownMin = aParams.use_custom_drilldown_min.toUpperCase() == 'Y';
        gCustomDrillDownMin = aParams.custom_drilldown_min;
        gUseCustomDrillDownMax = aParams.use_custom_drilldown_max.toUpperCase() == 'Y';
        gCustomDrillDownMax = aParams.custom_drilldown_max;
        gUseCustomDrillDownMin2 = aParams.hasOwnProperty('use_custom_drilldown_min2') ? aParams.use_custom_drilldown_min2.toUpperCase() == 'Y' : false;
        gCustomDrillDownMin2 = aParams.hasOwnProperty('custom_drilldown_min2') ? aParams.custom_drilldown_min2 : 0;
        gUseCustomDrillDownMax2 = aParams.hasOwnProperty('use_custom_drilldown_max2') ? aParams.use_custom_drilldown_max2.toUpperCase() == 'Y' : false;
        gCustomDrillDownMax2 = aParams.hasOwnProperty('custom_drilldown_max2') ? aParams.custom_drilldown_max2 : 0;

        if (aParams.use_detail == null || aParams.use_detail.toString() == 'Y') {
            gUseDetail = 1;
        } else {
            gUseDetail = parseInt(aParams.use_detail); // on click point - 0: not use, 1: show raw data chart, 2: show raw data table
        }

        gDetailLimit = aParams.detail_count;
        gDetailRows = aParams.detail_rows;
        gUseZoom = aParams.use_zoom.toUpperCase() == 'Y';
        gDrillDownZoom = aParams.drilldown_zoom.toUpperCase() == 'Y';

        gUseCustomColor = aParams.use_custom_color.toUpperCase() == 'Y';
        gColorSet = aParams.color_set;
        gChartType = aParams.chart_type.toLowerCase(); // reserved
        gXAxisType = aParams.x_axis_type.toLowerCase(); // reserved
        if (!gUseCustomColor) {
            var sTemp = gD3ColorSetName.filter(function (d) {
                return d.name == gColorSet;
            });
            if (sTemp.length < 1) {
                gColorSet = gD3ColorSetName[0]['name']; // 'schemeCategory10';
            }
        } else {
            if (aParams.color_set == 'machbaseColorSet') {
                aParams.color_set = gMachbaseColorSet;
            }
            var sTemp = aParams.color_set.split(',');
            gColorSet = sTemp.map(function (d) {
                return '#' + d;
            });
        }

        gHeightParam = aParams.chart_height; // pixel
        gWidthParam = aParams.chart_width; // pixel
        gHeight = gHeightParam;
        gWidth = gWidthParam;

        if (aParams.hasOwnProperty('timeout')) {
            gTimeOut = parseInt(aParams.timeout); // ajax timeout
        }

        if (aParams.hasOwnProperty('use_tag_minmax')) {
            gUseTagMinMax = aParams.use_tag_minmax.toUpperCase() == 'Y'; // Get Min/Max by Tag.
        }

        gUseY2 = [];
        gUseY2Axis = false;
        gY2Adjust = 0;
        gY2LeftAdjust = 0;
        gSeriesName = [];
        gAlias = [];
        gWeight = [];
        gMinArr = [];
        gMaxArr = [];
        for (var i = 0; i < gTagSets.length; i++) {
            if (!gTagSets[i].hasOwnProperty('use_y2')) {
                // for old dashboard
                gParams.tag_set[i].use_y2 = 'N';
                gTagSets[i].use_y2 = 'N';
            }
            if (!gTagSets[i].hasOwnProperty('alias')) {
                gParams.tag_set[i].alias = '';
                gTagSets[i].alias = '';
            }
            if (!gTagSets[i].hasOwnProperty('weight')) {
                gParams.tag_set[i].weight = 1.0;
                gTagSets[i].weight = 1.0;
            }
            if (!gTagSets[i].hasOwnProperty('min')) {
                gParams.tag_set[i].min = 0;
                gTagSets[i].min = 0;
            }
            if (!gTagSets[i].hasOwnProperty('max')) {
                gParams.tag_set[i].max = 0;
                gTagSets[i].max = 0;
            }
            if (!gTagSets[i].hasOwnProperty('table')) {
                gParams.tag_set[i].table = 'TAG';
                gTagSets[i].table = 'TAG';
            }
            var sName = gTagSets[i].tag_names.trim() + '(' + gTagSets[i].calculation_mode + ')';
            gSeriesName.push(sName);
            gUseY2.push(gTagSets[i].use_y2.toUpperCase());
            gAlias.push(gTagSets[i].alias);
            gWeight.push(gTagSets[i].weight);
            gMinArr.push(gTagSets[i].min);
            gMaxArr.push(gTagSets[i].max);
            if (gTagSets[i].use_y2.toUpperCase() == 'Y') {
                // use right y2 axis -> set y2 ticks width
                gUseY2Axis = true;
                if (gUseRightY2) {
                    gY2Adjust = gMargin.y2_right;
                } else {
                    gY2Adjust = gMargin.y2_left;
                    gY2LeftAdjust = gMargin.y2_left;
                }
            }
        }

        if (aParams.hasOwnProperty('server')) {
            gServerInfo.db_server = aParams.server;
            gServerInfo.use_custom = 'S'; // I(p) | S(erver) | N(o)
        }
        if (aParams.hasOwnProperty('db_ip')) {
            gServerInfo.db_ip = aParams.db_ip;
        }
        if (aParams.hasOwnProperty('db_port')) {
            gServerInfo.db_port = parseInt(aParams.db_port);
        }
        if (aParams.hasOwnProperty('db_user')) {
            gServerInfo.db_user = aParams.db_user;
        }
        if (aParams.hasOwnProperty('db_pass')) {
            gServerInfo.db_pass = aParams.db_pass;
        }
        if (gServerInfo.db_ip != '' && gServerInfo.db_port != '' && gServerInfo.db_user != '' && gServerInfo.db_pass != '') {
            gServerInfo.use_custom = 'I'; // I(p) | S(erver) | N(o)
        }
    };

    // *** setDivs(aTarget)
    // *** aTarget : Target div id
    this.setDivs = function (aTarget) {
        gTargetDiv = aTarget;
        gMainDiv = '#' + gTargetDiv;
        var sImgDel = '<img src="/static/img/iot/i_' + (gCssType == 'machIoTchartWhite' ? 'w' : 'b') + '_del.png" alt="" />';
        var sImgRef = '<img src="/static/img/iot/i_' + (gCssType == 'machIoTchartWhite' ? 'w' : 'b') + '_refresh.png" alt="" />';
        var sImgEdi = '<img src="/static/img/iot/i_' + (gCssType == 'machIoTchartWhite' ? 'w' : 'b') + '_edit.png" alt="" />';
        var sImgNew = '<img src="/static/img/iot/i_' + (gCssType == 'machIoTchartWhite' ? 'w' : 'b') + '_newwin.png" alt="" />';

        var sHtml =
            '\
<div class="maindiv maindiv_' +
            gTargetDiv +
            ' _maindiv" style="position:relative;">\
  <div class="wrap-loading" style="display:none">\
    <div><img src="/static/img/iot/ajax-loader-' +
            (gCssType == 'machIoTchartWhite' ? 'w' : 'b') +
            '.gif" alt="" /></div>\
  </div>\
  <div class="tooltips _graphtooltip" style="display:none;">\
  </div>\
  <div class="chartheader _chartheader">\
      <div class="row">\
        <div class="col-sm-3" data-toggle="tooltip" title="">\
          <button type="button" class="chartheadermark pull-left _copyurl" data-toggle="tooltip" title="" data-url=""></button>\
          <p class="_chartheadertext">Chart title</p>\
        </div>\
        <div class="col-sm-6" style="text-align:center;">\
          <div class="vport-center-group">\
            <div class="vport-btn vport-btn-left vport-btn-normal vport-btn-sm _title_sm_btn _title_sm_btn_move_one_left" style="display:none;width:28px;" data-toggle="tooltip" title="Move to the left by the chart size.">&lt;&lt;&lt;</div>\
            <div class="vport-btn vport-btn-left vport-btn-normal vport-btn-sm _title_sm_btn _title_sm_btn_move_half_left" style="display:none;" data-toggle="tooltip" title="Move to the left by half the size of the chart.">&lt;&lt;</div>\
            <div class="vport-btn vport-btn-left vport-btn-normal vport-btn-sm _title_sm_btn _title_sm_btn_move_quarter_left" style="display:none;" data-toggle="tooltip" title="Move to the left by quarter the size of the chart.">&lt;</div>\
            <p class="floatleft _chartrangetext"></p>\
            <div class="vport-btn vport-btn-right vport-btn-normal vport-btn-sm _title_sm_btn _title_sm_btn_move_one_right" style="display:none;width:28px;" data-toggle="tooltip" title="Move to the right by the chart size.">&gt;&gt;&gt;</div>\
            <div class="vport-btn vport-btn-right vport-btn-normal vport-btn-sm _title_sm_btn _title_sm_btn_move_half_right" style="display:none;" data-toggle="tooltip" title="Move to the right by half the size of the chart.">&gt;&gt;</div>\
            <div class="vport-btn vport-btn-right vport-btn-normal vport-btn-sm _title_sm_btn _title_sm_btn_move_quarter_right" style="display:none;" data-toggle="tooltip" title="Move to the right by quarter the size of the chart.">&gt;</div>\
          </div>\
        </div>\
        <div class="col-sm-3">\
          <button type="button" class="_deletechart pull-right" data-toggle="tooltip" title="delete" data-row="' +
            gRow.toString() +
            '" data-col="' +
            gCol.toString() +
            '">' +
            sImgDel +
            '</button>\
          <button type="button" class="_refreshchart pull-right" data-toggle="tooltip" title="refresh">' +
            sImgRef +
            '</button>\
          <button type="button" class="_editchart pull-right" data-toggle="tooltip" title="edit options" data-row="' +
            gRow.toString() +
            '" data-col="' +
            gCol.toString() +
            '">' +
            sImgEdi +
            '</button>\
          <button type="button" class="_viewchart pull-right" data-toggle="tooltip" data-row="' +
            gRow.toString() +
            '" title="View in a new window">' +
            sImgNew +
            '</button>\
          <p class="pull-right _charttimerange" data-toggle="tooltip" title=""></p>\
        </div>\
      </div>\
  </div>\
  <div class="chartdiv _chartdiv">\
  </div>\
  <div class="legenddiv _legenddiv">\
  </div>\
  <div class="viewport _viewport" style="display:none;">\
    <div class="viewport-inside">\
      <div class="viewport-inside-top">\
        <div class="vport-top-row row">\
          <div class="vport-top-row col-sm-4">\
            <div class="vport-btn vport-btn-left vport-btn-text vport-btn-bg _vport_range_bgn" data-toggle="tooltip" title="Use the start value to set the time range."></div>\
            <div class="vport-btn vport-btn-left vport-btn-normal vport-btn-lg _vport_undo_btn" data-toggle="tooltip" title="Return to previous zoom.">Undo</div>\
          </div>\
          <div class="vport-top-row col-sm-4">\
            <div class="vport-center-group">\
              <div class="vport-btn-none vport-btn-right _vport_sm_btn_zoom_out_50" data-toggle="tooltip" title="Zoom out 50%."><span class="glyphicon glyphicon-minus-sign"></span></div>\
              <div class="vport-btn-none vport-btn-right" style="cursor:default;width:5px;"></div>\
              <div class="vport-btn-none vport-btn-right _vport_sm_btn_zoom_out_20" data-toggle="tooltip" title="Zoom out 20%."><span class="glyphicon glyphicon-zoom-out"></span></div>\
              <div class="vport-btn-none vport-btn-left _vport_sm_btn_zoom_in_50" data-toggle="tooltip" title="Zoom in 50%."><span class="glyphicon glyphicon-plus-sign"></span></div>\
              <div class="vport-btn-none vport-btn-left" style="cursor:default;width:5px;"></div>\
              <div class="vport-btn-none vport-btn-left _vport_sm_btn_zoom_in_20" data-toggle="tooltip" title="Zoom in 20%."><span class="glyphicon glyphicon-zoom-in"></span></div>\
            </div>\
          </div>\
          <div class="vport-top-row col-sm-4">\
            <div class="vport-btn vport-btn-right vport-btn-text vport-btn-bg _vport_range_end" data-toggle="tooltip" title="Use the end value to set the time range."></div>\
            <div class="vport-btn vport-btn-right vport-btn-normal vport-btn-lg _vport_resize_btn" data-toggle="tooltip" title="Adjust the range of the viewport so that the [window] is 20%.">Resize</div>\
            <div class="vport-btn vport-btn-right vport-btn-normal vport-btn-lg _vport_center_btn" data-toggle="tooltip" title="Adjust the range of the viewport so that the [window] is centered.">Center</div>\
            <div class="vport-btn vport-btn-right vport-btn-normal vport-btn-lg _vport_reset_btn" data-toggle="tooltip" title="Adjust the range of the viewport from minimum to maximum.">Reset</div>\
          </div>\
        </div>\
      </div>\
      <div class="viewport-main">\
        <button type="button" class="_closevport" style="border:none;background:none;position:absolute;padding:0px;margin-top:5px;display:none;" data-toggle="tooltip" title="close zoom window."><span class="glyphicon glyphicon-remove"></span></button>\
      </div>\
    </div>\
  </div>\
  <div class="legendbottom _legendbottom">\
  </div>\
</div>\
<div class="maindiv maindiv_' +
            gTargetDiv +
            ' _detaildiv" style="display:none;">\
  <div class="row">\
    <div class="col-sm-9">\
      <h5 class="_tableheader pull-left" style="display:block;"></h5>\
    </div>\
    <div class="col-sm-3">\
      <button type="button" class="_closedetail pull-right" style="border:none;background:none;" data-toggle="tooltip" title="close raw data table"><span class="glyphicon glyphicon-remove"></span></button>\
    </div>\
  </div>\
  <table class="table table-condensed detailtable _detailtable">\
    <thead>\
      <tr>\
        <td style="width:70%">Time</td>\
        <td style="width:30%">Value</td>\
      </tr>\
    </thead>\
    <tbody>\
    </tbody>\
  </table>\
  <div class="_resPag" style="text-align:center;">\
    <nav>\
      <ul class="pagination _respage" style="margin:0px">\
      </ul>\
    </nav>\
  </div>\
</div>\
';
        $(gMainDiv).html(sHtml);
        if (gShowLegend == 'B') {
            $(gMainDiv + ' ._legendbottom').css('height', gLegendBottomHeight);
        }

        $('head style .maindiv_' + gTargetDiv).remove();
        $('head style .area_' + gTargetDiv).remove();
        $('head style .line_' + gTargetDiv).remove();
        if (gBorderColor != null) {
            if (gBorderColor == 'NONE') {
                $('<style/>', { text: '.maindiv_' + gTargetDiv + ' {border:1px solid ' + $('body').css('background-color') + ';}' }).appendTo('head');
            } else if (gBorderColor != '') {
                $('<style/>', { text: '.maindiv_' + gTargetDiv + ' {border:1px solid #' + gBorderColor + ';}' }).appendTo('head');
            }
        }
        $('<style/>', { text: '.area_' + gTargetDiv + ' {opacity: ' + gFill + ';}' }).appendTo('head');
        $('<style/>', { text: '.line_' + gTargetDiv + ' {fill:none;stroke-width: ' + gStroke + 'px;}' }).appendTo('head');

        $(gMainDiv + ' ._closedetail')
            .unbind('click')
            .click(function () {
                gCurrentPage = 1;
                $(gMainDiv + ' ._detaildiv').css('display', 'none');
            });

        $(gMainDiv + ' ._closevport')
            .unbind('click')
            .click(function () {
                gBgnParam = '';
                gEndParam = '';
                if (gParams.range_bgn != '') {
                    // range defined in chart setting
                    gBgnParam = gParams.range_bgn;
                }
                if (gParams.range_end != '') {
                    // range defined in chart setting
                    gEndParam = gParams.range_end;
                }

                if (gBgnParam == '' && gEndParam == '' && $('#_boards').length > 0) {
                    // range not defined in chart setting & _boards div exist
                    gBgnParam = $('#_boards').data('start'); // get Dashboard time range
                    gEndParam = $('#_boards').data('end');
                }

                calcQueryTime(function () {
                    if (gUnit == '') {
                        gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
                    }
                    generateRollupDataChart(false, null, true); // generateRollupDataChart(aCallFromDrawChart, aStartZoom, aCloseVport)
                });
            });

        $(gMainDiv + ' ._refreshchart')
            .unbind('click')
            .click(function () {
                var sVportDisplay = 'none';
                if (gStartWithVPort) {
                    sVportDisplay = 'block';
                }

                $(gMainDiv + ' ._refreshchart').blur();
                //$(gMainDiv + ' ._viewport').css('display', 'none');
                $(gMainDiv + ' ._viewport').css('display', sVportDisplay);

                //drawChart();
                if (gTags == '') {
                    generateRandomChart();
                } else {
                    generateRollupDataChart(true);
                }
            });

        if (gChartId != '') {
            $(gMainDiv + ' ._copyurl')
                .unbind('click')
                .click(function () {
                    var sForm = $('<input></input>').val($(this).data('url')).appendTo('body').select();
                    document.execCommand('copy');
                    sForm.remove();
                });
        }

        $(gMainDiv + ' ._viewchart')
            .unbind('click')
            .click(function () {
                var sForm = $('<form></form>').attr('action', '/tagview/chartview/').attr('method', 'post').attr('target', '_blank');
                sForm.append($('<input></input>').attr('type', 'hidden').attr('name', 'info').attr('value', JSON.stringify(gParams)));
                sForm.append(
                    $('<input></input>')
                        .attr('type', 'hidden')
                        .attr('name', 'ranges')
                        .attr('value', JSON.stringify({ begin: $(gMainDiv + ' ._chartdiv').data('bgn'), end: $(gMainDiv + ' ._chartdiv').data('end') }))
                );
                sForm.appendTo('body').submit().remove();
            });

        $(gMainDiv + ' ._title_sm_btn_move_one_left')
            .unbind('click')
            .click(function () {
                var sTimeGap = Math.floor(gGenerateEnd * 1000) - Math.floor(gGenerateBgn * 1000);
                var sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) - sTimeGap;
                var sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000);

                moveRawDataChart(sDateBgn, sDateEnd);
            });

        $(gMainDiv + ' ._title_sm_btn_move_half_left')
            .unbind('click')
            .click(function () {
                var sTimeGap = Math.floor(gGenerateEnd * 1000) - Math.floor(gGenerateBgn * 1000);
                var sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) - Math.floor(sTimeGap / 2);
                var sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) + Math.floor(sTimeGap / 2);
                if (sTimeGap < 2) {
                    sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) - 1;
                    sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) - 1;
                }
                moveRawDataChart(sDateBgn, sDateEnd);
            });

        $(gMainDiv + ' ._title_sm_btn_move_quarter_left')
            .unbind('click')
            .click(function () {
                var sTimeGap = Math.floor(gGenerateEnd * 1000) - Math.floor(gGenerateBgn * 1000);
                var sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) - Math.floor(sTimeGap / 4);
                var sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) + Math.floor((sTimeGap / 4) * 3);
                if (sTimeGap < 4) {
                    sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) - 1;
                    sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) - 1;
                }

                moveRawDataChart(sDateBgn, sDateEnd);
            });

        $(gMainDiv + ' ._title_sm_btn_move_quarter_right')
            .unbind('click')
            .click(function () {
                var sTimeGap = Math.floor(gGenerateEnd * 1000) - Math.floor(gGenerateBgn * 1000);
                var sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) - Math.floor((sTimeGap / 4) * 3);
                var sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) + Math.floor(sTimeGap / 4);
                if (sTimeGap < 4) {
                    sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) + 1;
                    sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) + 1;
                }

                moveRawDataChart(sDateBgn, sDateEnd);
            });

        $(gMainDiv + ' ._title_sm_btn_move_half_right')
            .unbind('click')
            .click(function () {
                var sTimeGap = Math.floor(gGenerateEnd * 1000) - Math.floor(gGenerateBgn * 1000);
                var sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) - Math.floor(sTimeGap / 2);
                var sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) + Math.floor(sTimeGap / 2);
                if (sTimeGap < 2) {
                    sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000) + 1;
                    sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) + 1;
                }

                moveRawDataChart(sDateBgn, sDateEnd);
            });

        $(gMainDiv + ' ._title_sm_btn_move_one_right')
            .unbind('click')
            .click(function () {
                var sTimeGap = Math.floor(gGenerateEnd * 1000) - Math.floor(gGenerateBgn * 1000);
                var sDateBgn = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000);
                var sDateEnd = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000) + sTimeGap;

                moveRawDataChart(sDateBgn, sDateEnd);
            });
    };

    // *** setOuter()
    // *** set Chart Header using gChartTitle <--- set from setVars()
    this.applyOutSets = function () {
        this.setHeader();

        if (gWidthParam > 0) {
            $(gMainDiv + ' .maindiv').css('width', gWidthParam);
        }

        this.calcHeight();
        $(gMainDiv + ' ._maindiv').css('min-height', gHeight + $(gMainDiv + ' ._chartheader').outerHeight() + 2);
        $(gMainDiv + ' ._chartdiv').height(gHeight); // set Temporary height
        $(gMainDiv + ' ._viewport').height(112); // set Temporary height
        $(gMainDiv + ' .viewport-main').height(60); // set Temporary height
        $(gMainDiv).css('height', ''); // remove height --> change to min-height
        if (gStartWithVPort) {
            $(gMainDiv + ' ._viewport').css('display', 'block');
        }

        this.calcWidth();
        if (gLimitParam < 0) {
            gLimit = Math.ceil(gInnerWidth / gTickPixels);
        }
    };

    // *** setHeader()
    // *** set Chart Header using gChartTitle <--- set from setVars()
    this.setHeader = function () {
        $(gMainDiv + ' ._chartheadertext').text(gChartTitle);

        var sRangeHtml = '';
        var sBgnRange = gParams.range_bgn.trim().toLowerCase();
        var sEndRange = gParams.range_end.trim().toLowerCase();
        var sRefresh = gRefresh;
        if (sBgnRange != '') {
            sRangeHtml += sBgnRange;
        }
        if (sBgnRange != '' || sEndRange != '') {
            sRangeHtml += ' ~ ';
        }
        if (sEndRange != '') {
            sRangeHtml += sEndRange;
        }
        if (sRefresh != '' && gRefresh != 'off') {
            sRangeHtml += ', refresh every ' + sRefresh;
        }
        $(gMainDiv + ' ._charttimerange').text(sRangeHtml);
        $(gMainDiv + ' ._charttimerange').prop('title', '');

        if (gChartId != '') {
            var sTemp = $(location).attr('href');
            var sIdx = sTemp.indexOf('/machchart/iot');
            sTemp = sTemp.substring(0, sIdx);
            var sUrl = sTemp + '/machchart/iot?id=' + gChartId;
            $(gMainDiv + ' ._copyurl').prop('title', 'Copy url to clipboard.\nURL: ' + sUrl);
            $(gMainDiv + ' ._copyurl').data('url', sUrl);
            $(gMainDiv + ' ._copyurl').css('cursor', 'pointer');
        } else {
            $(gMainDiv + ' ._copyurl').prop('title', '');
            $(gMainDiv + ' ._copyurl').data('url', '');
            $(gMainDiv + ' ._copyurl').css('cursor', 'default');
        }

        if (gChartMode == 'V') {
            $(gMainDiv + ' ._deletechart').css('display', 'none');
            $(gMainDiv + ' ._editchart').css('display', 'none');
        } else if (gChartMode == 'P') {
            $(gMainDiv + ' ._deletechart').css('display', 'none');
            $(gMainDiv + ' ._editchart').css('display', 'none');
            $(gMainDiv + ' ._viewchart').css('display', 'none');
        } else if (gChartMode == 'M') {
            $(gMainDiv + ' ._editchart').css('display', 'none');
            $(gMainDiv + ' ._deletechart').css('display', 'none');
            $(gMainDiv + ' ._viewchart').css('display', 'none');
        }

        if (gChartMode != 'M' && (gRow < 0 || gCol < 0)) {
            $(gMainDiv + ' ._deletechart').css('display', 'none');
            $(gMainDiv + ' ._editchart').css('display', 'none');
        }
    };

    // *** calcWidth()
    // *** calculate chart width using gWidthParam <--- set from setVars()
    this.calcWidth = function () {
        if (gWidthParam == null || gWidthParam == 0) {
            gWidth = $(gMainDiv + ' ._chartdiv').width();
        } else {
            gWidth = gWidthParam;
        }
        gWidth = gWidth - gLegendWidth;
        if (gWidth <= gMargin.left + gMargin.right + 50) {
            gWidth = gMargin.left + gMargin.right + 50;
        }
        gInnerWidth = gWidth - gMargin.left - gMargin.right;
        if (gUseY2Axis) {
            gInnerWidth = gInnerWidth - gY2Adjust;
        }

        if (gRawChartLimitParam < 0) {
            // -1: (chart width / 2), 0: chart width, >0: limit
            gRawChartLimit = Math.floor(gInnerWidth / 2);
        } else if (gRawChartLimitParam == 0) {
            gRawChartLimit = gInnerWidth;
        }
    };

    // *** calcHeight()
    // *** calculate chart height using gHeightParam <--- set from setVars()
    this.calcHeight = function () {
        if (gHeightParam == null || gHeightParam == 0) {
            gHeight = $(gMainDiv).height() - $(gMainDiv + ' ._chartheader').outerHeight() - 2; // 2 = _maindiv border thickness(top:1 + bottom:1)
        } else {
            gHeight = gHeightParam - $(gMainDiv + ' ._chartheader').outerHeight() - 2; // 2 = _maindiv border thickness(top:1 + bottom:1)
        }
        if (gShowLegend == 'B') {
            gHeight -= $(gMainDiv + ' ._legendbottom').outerHeight(true);
        }
        if (gHeight <= gMargin.top + gMargin.bottom + 50) {
            gHeight = gMargin.top + gMargin.bottom + 50;
        }

        gInnerHeight = gHeight - gMargin.top - gMargin.bottom;
    };
    //////////////// functions for generate Chart settings (end) ////

    //////////////// Main functions (begin) ////
    // *** Get Data and Draw Chart. --> make chart data and call chartProcess()
    // *** drawChart(aTimeRange)
    // *** aTimeRange : {'begin': Begin Time, 'end': End Time}, if not passed, calculate the time using the parameters passed to serVars().
    this.drawChart = function (aTimeRange, aFirst) {
        if (aTimeRange !== undefined && aTimeRange !== null) {
            gBgnParam = aTimeRange['begin'];
            gEndParam = aTimeRange['end'];
        } else {
            gBgnParam = gParams.range_bgn.trim().toLowerCase();
            gEndParam = gParams.range_end.trim().toLowerCase();
        }
        if (aFirst == null) {
            aFirst = false;
        }
        calcQueryTime(function () {
            var sHint = gBgn + ' ~ ' + gEnd;
            if (gParams.range_bgn.trim() == '' && gParams.range_end.trim() == '') {
                if (gBgnParam != '' && gEndParam != '') {
                    $('._boardtimerange').prop('title', sHint);
                }
            } else {
                $(gMainDiv + ' ._charttimerange').prop('title', sHint);
            }

            if (gUnit == '') {
                gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
            }
            if (gTags == '') {
                parseTime = d3.timeParse('%Y-%m-%d');
                formatTime = d3.timeFormat('%Y-%m-%d');
                bisectDate = d3.bisector(function (d) {
                    return d.date;
                }).left;

                generateRandomChart();
            } else {
                parseTime = d3.timeParse('%Y-%m-%d %H:%M:%S,%L');
                formatTime = d3.timeFormat('%Y-%m-%d %H:%M:%S,%L');
                bisectDate = d3.bisector(function (d) {
                    return d.date;
                }).left;

                generateRollupDataChart(aFirst);
            }
        });
    };

    // *** getDivDisplay(aDiv)
    // *** get div display status
    // *** aDiv : div class name = _chartheader _chartdiv _legenddiv _viewport _detaildiv
    this.getDivDisplay = function (aDiv) {
        return $(gMainDiv + ' .' + aDiv).css('display');
    };

    // *** chartProcessing()
    // *** just call chartProcess() e.g. call from resize event
    this.chartProcessing = function () {
        chartProcess(false, true);
    };

    // *** chartProcess(aSkipVport, aCallFromResize)
    // *** Draw chart from given data.
    // *** aSkipVport : Skip Draw Viewport, Can be omitted(default = false)
    // *** aCallFromResize : call from Browser resize.(make selection after viewport draw)
    function chartProcess(aSkipVport, aCallFromResize) {
        if (aSkipVport == null) {
            aSkipVport = false;
        }
        if (aCallFromResize == null) {
            aCallFromResize = false;
        }
        gSelectedX = { start: 0, end: 0 };
        gDragged = false;
        gWheeled = 0;
        var sTempMinY = [];
        var sTempMaxY = [];
        var sTempSeries = [];
        var sTempIndex = 0;
        // calc min/max for Y1
        if (gUseNormalize == 'N') {
            sTempSeries = gSeriesData.filter(function (s) {
                return s.length > 0 && s[0].use_y2 != 'Y';
            });
            gMinY = d3.min(sTempSeries, function (s) {
                return d3.min(s, function (d) {
                    return d.value;
                });
            });
            gMaxY = d3.max(sTempSeries, function (s) {
                return d3.max(s, function (d) {
                    return d.value;
                });
            });
        } else {
            // y nomalize
            sTempSeries = gSeriesData.filter(function (s) {
                if (s.length > 0 && s[0].use_y2 != 'Y') {
                    sTempIndex = s[0].name.replace('series_', '');
                    sTempMinY.push(gMinArr[sTempIndex]);
                    sTempMaxY.push(gMaxArr[sTempIndex]);
                    return s;
                }
            });
            gMinY = d3.min(sTempMinY);
            gMaxY = d3.max(sTempMaxY);
        }

        var sTempGap = gMaxY - gMinY;
        var sTempLen = sTempGap >= 100000 ? 6 : parseInt(sTempGap).toString().length;
        var sAdjust = sTempGap < 1 ? sTempGap * 0.05 : 5 * Math.pow(10, sTempLen - 3); // <1:*0.05, <10:0.05, <100:0.5, <1000:5, <10000:50, <100000:500, >=100000:5000
        if (gUseNormalize == 'N') {
            gMinYUsed = gMinY > sAdjust || gMinY < 0 ? gMinY - sAdjust : 0;
            gMaxYUsed = gMaxY < -1 * sAdjust || gMaxY > 0 ? gMaxY + sAdjust : 0;
        } else {
            gMinYUsed = 0;
            gMaxYUsed = 100;
        }

        // calc min/max for Y2
        if (gUseY2Axis) {
            if (gUseNormalize == 'N') {
                sTempSeries = gSeriesData.filter(function (s) {
                    return s.length > 0 && s[0].use_y2 == 'Y';
                });
                gMinY2 = d3.min(sTempSeries, function (s) {
                    return d3.min(s, function (d) {
                        return d.value;
                    });
                });
                gMaxY2 = d3.max(sTempSeries, function (s) {
                    return d3.max(s, function (d) {
                        return d.value;
                    });
                });
                sTempGap = gMaxY2 - gMinY2;
                sTempLen = sTempGap >= 100000 ? 6 : parseInt(sTempGap).toString().length;
                sAdjust = sTempGap < 1 ? sTempGap * 0.05 : 5 * Math.pow(10, sTempLen - 3); // <1:*0.05, <10:0.05, <100:0.5, <1000:5, <10000:50, <100000:500, >=100000:5000
                gMinYUsed2 = gMinY2 > sAdjust || gMinY2 < 0 ? gMinY2 - sAdjust : 0;
                gMaxYUsed2 = gMaxY2 < -1 * sAdjust || gMaxY2 > 0 ? gMaxY2 + sAdjust : 0;
            } else {
                sTempMinY = [];
                sTempMaxY = [];
                sTempSeries = gSeriesData.filter(function (s) {
                    return s.length > 0 && s[0].use_y2 == 'Y';
                });
                sTempSeries = gSeriesData.filter(function (s) {
                    if (s.length > 0 && s[0].use_y2 == 'Y') {
                        var sTempIdx = s[0].name.replace('series_', '');
                        sTempMinY.push(gMinArr[sTempIdx]);
                        sTempMaxY.push(gMaxArr[sTempIdx]);
                        return s;
                    }
                });
                gMinY2 = d3.min(sTempMinY);
                gMaxY2 = d3.max(sTempMaxY);
                sTempGap = gMaxY2 - gMinY2;
                sTempLen = sTempGap >= 100000 ? 6 : parseInt(sTempGap).toString().length;
                sAdjust = sTempGap < 1 ? sTempGap * 0.05 : 5 * Math.pow(10, sTempLen - 3); // <1:*0.05, <10:0.05, <100:0.5, <1000:5, <10000:50, <100000:500, >=100000:5000
                gMinYUsed2 = 0;
                gMaxYUsed2 = 100;
            }
        }

        if (gZero) {
            if (gMinYUsed > 0) {
                gMinYUsed = 0;
            }
            if (gMaxYUsed < 0) {
                gMaxYUsed = 0;
            }
            if (gMinYUsed2 > 0) {
                gMinYUsed2 = 0;
            }
            if (gMaxYUsed2 < 0) {
                gMaxYUsed2 = 0;
            }
        }

        //if (gIsDrilledChart == 0)  // not drilldown chart
        if (gIsDrilledChart != 2) {
            // 0: rollup chart, 1: drill down chart, 2: raw data chart
            if (gUseCustomMin) {
                gMinYUsed = gCustomMin;
            }
            if (gUseCustomMax) {
                gMaxYUsed = gCustomMax;
            }
            if (gUseCustomMin2) {
                gMinYUsed2 = gCustomMin2;
            }
            if (gUseCustomMax2) {
                gMaxYUsed2 = gCustomMax2;
            }
        } else {
            if (gUseCustomDrillDownMin) {
                gMinYUsed = gCustomDrillDownMin;
            }
            if (gUseCustomDrillDownMax) {
                gMaxYUsed = gCustomDrillDownMax;
            }
            if (gUseCustomDrillDownMin2) {
                gMinYUsed2 = gCustomDrillDownMin2;
            }
            if (gUseCustomDrillDownMax2) {
                gMaxYUsed2 = gCustomDrillDownMax2;
            }
        }

        var sTicks = 5;
        if (gMaxYUsed - gMinYUsed < 2) {
            sTicks = 3;
        } else if (gMaxYUsed - gMinYUsed < 4) {
            sTicks = 4;
        }
        var sTicks2 = 5; // Number of Y-axis ticks
        if (gMaxYUsed2 - gMinYUsed2 < 2) {
            sTicks2 = 3;
        } else if (gMaxYUsed2 - gMinYUsed2 < 4) {
            sTicks2 = 4;
        }

        var sBgnReal = '';
        var sEndReal = '';
        if (gDrillDownZoom) {
            sBgnReal = gGenerateBgn; // store generateData() time range.
            sEndReal = gGenerateEnd; // store generateData() time range.
        } else {
            if (gSeriesData.length > 0) {
                for (var i = 0; i < gSeriesData.length; i++) {
                    if (gSeriesData[i].length <= 0) {
                        continue;
                    }
                    if (sBgnReal == '' || sBgnReal > gSeriesData[i][0].date) {
                        sBgnReal = gSeriesData[i][0].date;
                    }
                    if (sEndReal == '' || sEndReal > gSeriesData[i][gSeriesData[i].length - 1].date) {
                        sEndReal = gSeriesData[i][gSeriesData[i].length - 1].date;
                    }
                }
            }
        }

        if (gIsDrilledChart != 2) {
            // 0: rollup chart, 1: drill down chart, 2: raw data chart
            gX = d3.scaleTime().domain([sBgnReal, sEndReal]).range([0, gInnerWidth]);
        } else {
            gX = d3.scaleLinear().domain([sBgnReal, sEndReal]).range([0, gInnerWidth]);
        }
        gY = d3.scaleLinear().domain([gMinYUsed, gMaxYUsed]).range([gInnerHeight, 0]);
        gY2 = d3.scaleLinear().domain([gMinYUsed2, gMaxYUsed2]).range([gInnerHeight, 0]);

        if (!gUseCustomColor) {
            gZ = d3.scaleOrdinal(d3[gColorSet]).domain(
                gSeriesName.map(function (d, i) {
                    return 'series_' + i.toString();
                })
            );
        } else {
            gZ = d3
                .scaleOrdinal()
                .domain(
                    gSeriesName.map(function (d, i) {
                        return 'series_' + i.toString();
                    })
                )
                .range(gColorSet);
        }
        if (gUseNormalize == 'N') {
            gAreaGen = d3
                .area()
                .x(function (d) {
                    return gX(d.date);
                })
                .y1(function (d) {
                    return d.use_y2 != 'Y' ? gY(d.value) : gY2(d.value);
                })
                .y0(function (d) {
                    return d.use_y2 != 'Y' ? gY(gMinYUsed) : gY2(gMinYUsed2);
                });
            gLineGen = d3
                .line()
                .x(function (d) {
                    return gX(d.date);
                })
                .y(function (d) {
                    return d.use_y2 != 'Y' ? gY(d.value) : gY2(d.value);
                });
        } else {
            gAreaGen = d3
                .area()
                .x(function (d) {
                    return gX(d.date);
                })
                .y1(function (d) {
                    sTempIndex = d.name.replace('series_', '');
                    return d.use_y2 != 'Y'
                        ? gY(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight)
                        : gY2(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight);
                })
                .y0(function (d) {
                    return d.use_y2 != 'Y' ? gY(gMinYUsed) : gY2(gMinYUsed2);
                });
            gLineGen = d3
                .line()
                .x(function (d) {
                    return gX(d.date);
                })
                .y(function (d) {
                    sTempIndex = d.name.replace('series_', '');
                    return d.use_y2 != 'Y'
                        ? gY(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight)
                        : gY2(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight);
                });
        }

        gTickFormat = function (date) {
            if (date.getMilliseconds()) return d3.timeFormat('.%L')(date);
            if (date.getSeconds()) return d3.timeFormat(':%S')(date);
            if (date.getMinutes()) return d3.timeFormat('%H:%M')(date);
            if (date.getHours()) return d3.timeFormat('%H:%M')(date);
            if (date.getDay() && date.getDate() != 1) return d3.timeFormat('%a %d')(date);
            if (date.getDate() != 1) return d3.timeFormat('%b %d')(date);
            if (date.getMonth()) return d3.timeFormat('%B')(date);
            return d3.timeFormat('%Y')(date);
        };

        if (gIsDrilledChart != 2) {
            // 0: rollup chart, 1: drill down chart, 2: raw data chart
            gXaxisCall = d3
                .axisBottom(gX)
                //               .ticks(d3.timeDay.filter(function(d) {return (d.getDate() == 1 || d.getDate() == 15);}))
                //               .tickFormat(function(d) {return ((d.getMonth()==0 && d.getDate()==1) ? d3.timeFormat('%Y')(d) : (d.getDate()==1 ? d3.timeFormat('%b')(d) : ''));});
                .ticks(Math.ceil(gWidth / 90))
                .tickFormat(gTickFormat);
        } else {
            gXaxisCall = d3
                .axisBottom(gX)
                .ticks(Math.ceil(gWidth / 90))
                .tickFormat(function (d) {
                    var sTemp = gRawDataBaseTime.getTime() + Math.floor(d * 1000);
                    return d3.timeFormat('%H:%M:%S,%L')(sTemp);
                });
        }
        if (gUseNormalize == 'N') {
            gYaxisCall = d3
                .axisLeft(gY)
                .ticks(sTicks)
                .tickFormat(function (d) {
                    return d < 1 && d > -1 ? d3.format('')(d) : d < 10000 && d > -10000 ? d3.format(sTicks == 3 ? '.1f' : ',d')(d) : d3.format('.3s')(d);
                });
            if (gUseRightY2) {
                gYaxisCall2 = d3
                    .axisRight(gY2)
                    .ticks(sTicks2)
                    .tickFormat(function (d) {
                        return d < 1 && d > -1 ? d3.format('')(d) : d < 10000 && d > -10000 ? d3.format(sTicks2 == 3 ? '.1f' : ',d')(d) : d3.format('.3s')(d);
                    });
            } else {
                gYaxisCall2 = d3
                    .axisLeft(gY2)
                    .ticks(sTicks2)
                    .tickFormat(function (d) {
                        return d < 1 && d > -1 ? d3.format('')(d) : d < 10000 && d > -10000 ? d3.format(sTicks2 == 3 ? '.1f' : ',d')(d) : d3.format('.3s')(d);
                    });
            }
        } else {
            gYaxisCall = d3
                .axisLeft(gY)
                .ticks(sTicks)
                .tickFormat(function (d) {
                    return ' ';
                });
            if (gUseRightY2) {
                gYaxisCall2 = d3
                    .axisRight(gY2)
                    .ticks(sTicks2)
                    .tickFormat(function (d) {
                        return ' ';
                    });
            } else {
                gYaxisCall2 = d3
                    .axisLeft(gY2)
                    .ticks(sTicks2)
                    .tickFormat(function (d) {
                        return ' ';
                    });
            }
        }
        gDrag = d3.drag().on('start', dragStart).on('drag', dragMove).on('end', dragEnd);

        d3.select(gMainDiv).select('._chartdiv').select('svg').remove();
        $(gMainDiv + ' ._chartdiv').height(gHeight);
        gSvg = d3
            .select(gMainDiv)
            .select('._chartdiv')
            .append('svg')
            .attr('width', gWidth)
            .attr('height', gHeight)
            .on('wheel', handleWheelEvent)
            .on('contextmenu', mouseRightClick);
        gG = gSvg.append('g').attr('transform', 'translate(' + (gMargin.left + gY2LeftAdjust) + ', ' + gMargin.top + ')');

        drawAxis('A');
        drawMainChart();

        if (gUseY2Axis) {
            gG.selectAll('.axis-y')
                .selectAll('text')
                .style('cursor', 'default')
                .on('mouseover', handleAxisMouseOver1)
                .on('mouseout', handleAxisMouseOut)
                .on('click', handleAxisClick1);

            gG.selectAll('.axis-y2')
                .selectAll('text')
                .style('cursor', 'default')
                .on('mouseover', handleAxisMouseOver2)
                .on('mouseout', handleAxisMouseOut)
                .on('click', handleAxisClick2);
        }

        gVLine = gG.append('line').attr('class', 'vline').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', gInnerHeight).style('display', 'none');

        gDraged = gG.append('rect').attr('class', 'draged').attr('x', 0).attr('y', 0).attr('width', 0).attr('height', gInnerHeight).style('display', 'none');

        gTooltip = d3.select(gMainDiv).select('._graphtooltip').style('display', 'none');

        gRect = gSvg
            .append('g')
            .attr('transform', 'translate(' + (gMargin.left + gY2LeftAdjust) + ', ' + gMargin.top + ')')
            .append('rect')
            .attr('class', 'overlay')
            .attr('width', gInnerWidth)
            .attr('height', gInnerHeight)
            .on('mouseover', handleMouseOver)
            .on('mouseout', handleMouseOut)
            .on('mousemove', handleMouseMove);
        if (gUseDetail != 0) {
            gRect.on('click', handleClick);
        }
        if (gUseZoom) {
            gRect.call(gDrag);
        }

        setSelectionColor();

        if (gClickedName != '') {
            legendClick(gClickedName);
        }
        if (gClickedAxis != '') {
            axisClick(gClickedAxis);
        }

        var sIsNoData = true;
        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length > 0) {
                sIsNoData = false;
                break;
            }
        }
        if (sIsNoData) {
            $(gMainDiv + ' ._chartdiv .addpaneltextdiv').remove();
            $(gMainDiv + ' ._chartdiv').append('<div class="addpaneltextdiv" style="top:30%;"><div style="float:left;"><span class="addpaneltext">No Data</span></div></div>');
        } else {
            $(gMainDiv + ' ._chartdiv .addpaneltextdiv').remove();
        }

        ////////// draw Viewport
        if (aSkipVport) {
            return;
        }
        var sSelectionBgn = sBgnReal;
        var sSelectionEnd = sEndReal;
        var sMinYUsed = gMinYUsed;
        var sMaxYUsed = gMaxYUsed;
        var sMinYUsed2 = gMinYUsed2;
        var sMaxYUsed2 = gMaxYUsed2;

        if (aCallFromResize) {
            sMinYUsed = parseFloat($(gMainDiv + ' ._viewport').data('min'));
            sMaxYUsed = parseFloat($(gMainDiv + ' ._viewport').data('max'));
            sMinYUsed2 = parseFloat($(gMainDiv + ' ._viewport').data('min2'));
            sMaxYUsed2 = parseFloat($(gMainDiv + ' ._viewport').data('max2'));
        } else {
            $(gMainDiv + ' ._viewport').data('min', gMinYUsed);
            $(gMainDiv + ' ._viewport').data('max', gMaxYUsed);
            $(gMainDiv + ' ._viewport').data('min2', gMinYUsed2);
            $(gMainDiv + ' ._viewport').data('max2', gMaxYUsed2);
        }

        var sTitleHeight = $(gMainDiv + ' ._chartheader').outerHeight();
        gVportHeight = parseInt(gHeight / 8) + sTitleHeight;
        gVportInHeight = gVportHeight - 2 - sTitleHeight;
        //gVportWidth = gWidth - 60 - 2;
        var sAdjustWidth = parseInt($(gMainDiv + ' .viewport-inside').css('margin-left')) + parseInt($(gMainDiv + ' .viewport-inside').css('margin-right'));
        sAdjustWidth += parseInt($(gMainDiv + ' .viewport-inside').css('padding-left')) + parseInt($(gMainDiv + ' .viewport-inside').css('padding-right'));
        sAdjustWidth += parseInt($(gMainDiv + ' .viewport-inside').css('border-left-width')) + parseInt($(gMainDiv + ' .viewport-inside').css('border-right-width'));
        gVportWidth = gWidth - sAdjustWidth;
        gVportInnerWidth = gVportWidth - gMargin.left + 15; // +20(reduce left margin) -5(.viewport-inside right margin)

        sBgnReal = '';
        sEndReal = '';
        if (gDrillDownZoom) {
            //sBgnReal = gGenerateBgn;  // store generateData() time range.
            //sEndReal = gGenerateEnd;  // store generateData() time range.
            sBgnReal = d3.timeParse('%Y-%m-%d %H:%M:%S')(
                $(gMainDiv + ' ._chartdiv')
                    .data('bgn_date')
                    .substring(0, 19)
            );
            sEndReal = d3.timeParse('%Y-%m-%d %H:%M:%S')(
                $(gMainDiv + ' ._chartdiv')
                    .data('end_date')
                    .substring(0, 19)
            );
        } else {
            for (var i = 0; i < gVPortSeries.length; i++) {
                if (gVPortSeries[i].length <= 0) {
                    continue;
                }
                if (sBgnReal == '' || sBgnReal > gVPortSeries[i][0].date) {
                    sBgnReal = gVPortSeries[i][0].date;
                }
                if (sEndReal == '' || sEndReal > gVPortSeries[i][gVPortSeries[i].length - 1].date) {
                    sEndReal = gVPortSeries[i][gVPortSeries[i].length - 1].date;
                }
            }
        }
        gXVport = d3.scaleTime().domain([sBgnReal, sEndReal]).range([0, gVportInnerWidth]);
        gYVport = d3.scaleLinear().domain([sMinYUsed, sMaxYUsed]).range([gVportInHeight, 0]);
        gYVport2 = d3.scaleLinear().domain([sMinYUsed2, sMaxYUsed2]).range([gVportInHeight, 0]);
        if (gUseNormalize == 'N') {
            gLineGenVport = d3
                .line()
                .x(function (d) {
                    return gXVport(d.date);
                })
                .y(function (d) {
                    return d.use_y2 != 'Y' ? gYVport(d.value) : gYVport2(d.value);
                });
        } else {
            gLineGenVport = d3
                .line()
                .x(function (d) {
                    return gXVport(d.date);
                })
                .y(function (d) {
                    sTempIndex = d.name.replace('series_', '');
                    return d.use_y2 != 'Y'
                        ? gYVport(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight)
                        : gYVport2(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight);
                });
        }
        gDiv = d3.select(gMainDiv).select('.viewport-main');
        gDiv.select('svg').remove();

        gSvgVport = gDiv.append('svg').attr('width', gVportWidth).attr('height', gVportHeight).on('wheel', handleWheelEvent).on('contextmenu', mouseRightClick);
        gGVport = gSvgVport.append('g').attr('transform', 'translate(' + (gMargin.left - 20) + ', 10)'); // -20: reduce left margin,  10: .viewport-inside top margin

        var sGVportAxisX = gGVport
            .append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', 'translate(0, ' + gVportInHeight + ')')
            .call(d3.axisBottom(gXVport).ticks(Math.ceil(gVportWidth / 90)));
        if (gShowXAxisTickLine) {
            sGVportAxisX.selectAll('.tick line').attr('y2', -1 * gVportInHeight);
        }

        var sGVportAxisY = gGVport.append('g').attr('class', 'axis axis-y').call(d3.axisLeft(gYVport).ticks(1));
        var sGVportAxisY2 = gGVport.append('g').attr('class', 'axis axis-y2').call(d3.axisLeft(gYVport2).ticks(0)); // any position ok <-- no transform

        sGVportAxisY.append('line').attr('class', 'axis-line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', gVportInHeight);

        if (gShowYAxisTickLine) {
            sGVportAxisY.selectAll('.tick line').attr('x2', gVportInnerWidth);
        }
        sGVportAxisY.selectAll('text').remove();
        sGVportAxisY2.selectAll('text').remove();

        gLineVport = gGVport.selectAll('.serie').data(gVPortSeries).enter().append('g').attr('class', 'serie');

        gLineVport
            .append('path')
            //                      .attr('class', 'line')
            .attr('class', 'line line_' + gTargetDiv)
            .style('stroke', function (d) {
                return d.length > 0 ? gZ(d[0].name) : '#5ca3f2';
            })
            .style('stroke-width', 0.5)
            .attr('d', gLineGenVport);

        if (gUseNormalize == 'N') {
            gLineVport
                .selectAll('.point')
                .data(function (d) {
                    return d;
                })
                .enter()
                .append('circle')
                .attr('class', 'point')
                .style('stroke', function (d) {
                    return gZ(d.name);
                })
                .style('fill', function (d) {
                    return gZ(d.name);
                })
                .attr('r', 0.6)
                .attr('cx', function (d) {
                    return gXVport(d.date);
                })
                .attr('cy', function (d) {
                    return d.use_y2 != 'Y' ? gYVport(d.value) : gYVport2(d.value);
                });
        } else {
            gLineVport
                .selectAll('.point')
                .data(function (d) {
                    return d;
                })
                .enter()
                .append('circle')
                .attr('class', 'point')
                .style('stroke', function (d) {
                    return gZ(d.name);
                })
                .style('fill', function (d) {
                    return gZ(d.name);
                })
                .attr('r', 0.6)
                .attr('cx', function (d) {
                    return gXVport(d.date);
                })
                .attr('cy', function (d) {
                    sTempIndex = d.name.replace('series_', '');
                    return d.use_y2 != 'Y'
                        ? gYVport(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight)
                        : gYVport2(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight);
                });
        }

        gViewport = d3
            .brushX(gXVport)
            .extent([
                [0, 0],
                [gVportInnerWidth, gVportInHeight],
            ])
            .on('end', brushend)
            .on('brush', brushed);
        gGVport
            .append('g')
            .attr('class', 'viewarea')
            .call(gViewport)
            .selectAll('.overlay')
            .each(function (d) {
                d.type = 'selection';
            }) // Treat overlay interaction as move.
            .on('mousedown touchstart', brushcentered); // Recenter before brushing.

        gGVport.selectAll('.selection').on('mousedown', selectionDblClick);

        $(gMainDiv + ' .viewport-main').css('height', gVportHeight);
        //$(gMainDiv + ' ._viewport').css('height', gVportHeight + 54);
        var sAdjustHeight = $(gMainDiv + ' .viewport-inside-top').outerHeight(true); // true : include margin
        sAdjustHeight += parseInt($(gMainDiv + ' .viewport-inside').css('padding-top')) + parseInt($(gMainDiv + ' .viewport-inside').css('padding-bottom'));
        sAdjustHeight += parseInt($(gMainDiv + ' .viewport-inside').css('border-top-width')) + parseInt($(gMainDiv + ' .viewport-inside').css('border-bottom-width'));
        $(gMainDiv + ' ._viewport').css('height', gVportHeight + sAdjustHeight);
        $(gMainDiv + ' ._closevport').css('display', 'block');
        $(gMainDiv + ' ._closevport').css('left', gMargin.left - 5); // -5: ._closevport left margin

        if (aCallFromResize) {
            var sBgnX = gXVport(sSelectionBgn);
            var sEndX = gXVport(sSelectionEnd);
            gGVport.select('.viewarea').call(gViewport.move, [sBgnX, sEndX]);
        }

        $(gMainDiv + ' .vport-btn,.vport-btn-none')
            .unbind('mousedown')
            .mousedown(function (aEvent) {
                aEvent.preventDefault();
            }); // prevent text select on double click

        $(gMainDiv + ' ._vport_range_bgn')
            .unbind('click')
            .click({ event: 'begin' }, callVportRangeModal);
        $(gMainDiv + ' ._vport_undo_btn')
            .unbind('click')
            .click(mouseRightClick);
        //$(gMainDiv + ' ._vport_sm_btn_zoom_in_left').unbind('click').click( {left:0.05, right:0}, adjustViewport );
        //$(gMainDiv + ' ._vport_sm_btn_zoom_out_left').unbind('click').click( {left:-0.05, right:0}, adjustViewport );
        //$(gMainDiv + ' ._vport_sm_btn_move_one_left').unbind('click').click( {left:-1, right:-1}, adjustViewport );
        //$(gMainDiv + ' ._vport_sm_btn_move_half_left').unbind('click').click( {left:-0.5, right:-0.5}, adjustViewport );
        //$(gMainDiv + ' ._vport_sm_btn_move_half_right').unbind('click').click( {left:0.5, right:0.5}, adjustViewport );
        //$(gMainDiv + ' ._vport_sm_btn_move_one_right').unbind('click').click( {left:1, right:1}, adjustViewport );
        //$(gMainDiv + ' ._vport_sm_btn_zoom_in_right').unbind('click').click( {left:0, right:-0.05}, adjustViewport );
        //$(gMainDiv + ' ._vport_sm_btn_zoom_out_right').unbind('click').click( {left:0, right:0.05}, adjustViewport );
        $(gMainDiv + ' ._vport_sm_btn_zoom_out_50')
            .unbind('click')
            .click({ type: 'O', zoom: 0.5 }, adjustViewportRange);
        $(gMainDiv + ' ._vport_sm_btn_zoom_out_20')
            .unbind('click')
            .click({ type: 'O', zoom: 0.2 }, adjustViewportRange);
        $(gMainDiv + ' ._vport_sm_btn_zoom_in_20')
            .unbind('click')
            .click({ type: 'I', zoom: 0.2 }, adjustViewportRange);
        $(gMainDiv + ' ._vport_sm_btn_zoom_in_50')
            .unbind('click')
            .click({ type: 'I', zoom: 0.5 }, adjustViewportRange);
        $(gMainDiv + ' ._vport_reset_btn')
            .unbind('click')
            .click({ event: 'reset' }, resetViewport);
        $(gMainDiv + ' ._vport_center_btn')
            .unbind('click')
            .click({ event: 'center' }, resetViewport);
        $(gMainDiv + ' ._vport_resize_btn')
            .unbind('click')
            .click({ event: 'resize' }, resetViewport);
        $(gMainDiv + ' ._vport_range_end')
            .unbind('click')
            .click({ event: 'end' }, callVportRangeModal);
    }
    //////////////// Main functions (end) ////

    //////////////// functions for Chart information service (begin) /////////////////
    this.getChartMinMaxDate = function (aTag, aTimeOut, aTRSet) {
        getMinMaxDate(aTag, aTimeOut, aTRSet, gServerInfo);
    };

    this.getVisibleTags = function () {
        sReturn = [];
        for (var i = 0; i < gSeriesName.length; i++) {
            var sSerieName = 'series_' + i.toString();
            var sIdx = gSeriesData.findIndex(function (aArray) {
                return aArray.length > 0 && aArray[0].name == sSerieName;
            });
            if (sIdx < 0) {
                continue;
            }
            if ($(gMainDiv + ' #_a' + sSerieName).css('display') == 'none') {
                continue;
            }
            sReturn.push(gSeriesData[sIdx][0].key);
        }
        return sReturn;
    };

    this.getDisplayPeriod = function () {
        return { from: gBgnChart, to: gEndChart }; // YYYY-MM-DD HH24:MI:SS or YYYY-MM-DD HH24:MI:SS,mmm
    };

    this.getXaxisInterval = function () {
        // {'type': '', 'value': 0} : If the raw data chart, type is empty.
        return gChartInterval;
    };
    //////////////// functions for Chart information service (end) /////////////////

    //////////////// functions for generate Chart (begin) /////////////////
    function generateRandomChart() {
        gData = [];
        gData.columns = ['date', 'Auto_001', 'Auto_002'];
        gData.types = ['DATETIME', 'LONG', 'LONG'];

        var sDt = new Date('2015-01-01');
        var sA = 150;
        var sB = 50;
        var sT = 0;
        var sTotalCount = 0;
        for (var i = 0; i < 365 * 2; i++) {
            sT = Math.floor(Math.random() * 60) - 30;
            sA += sT;
            if (sA < 80 || sA > 200) {
                sA -= sT * 2;
            }

            sT = Math.floor(Math.random() * 40) - 20;
            sB += sT;
            if (sB < 20 || sB > 100) {
                sB -= sT * 2;
            }

            sTotalCount += sA + sB;
            gData.push({ date: formatTime(sDt), Auto_001: sA, Auto_002: sB });
            sDt.setDate(sDt.getDate() + 1);
        }
        if (gRawChartThresholdParam > 0 && gRawChartThresholdParam < 1) {
            gRawChartThreshold = Math.ceil(sTotalCount * gRawChartThresholdParam);
        } else if (gRawChartThresholdParam == 0) {
            gRawChartThreshold = Math.ceil((sTotalCount / gData.length) * 4);
        }

        $(gMainDiv + ' ._chartdiv').data('bgn', '2015-01-01 00:00:00');
        $(gMainDiv + ' ._chartdiv').data('end', '2016-12-31 23:59:59');
        $(gMainDiv + ' ._chartdiv').data('bgn_date', '2015-01-01 00:00:00');
        $(gMainDiv + ' ._chartdiv').data('end_date', '2016-12-31 23:59:59');

        generateData('2015-01-01 00:00:00', '2016-12-31 23:59:59', gData, 0); // generate all gSeriesData
        gVPortSeries = $.extend(true, [], gSeriesData); // Deep copy array for Zoom view port

        chartProcess();
        storeZoomInfomation();
    }

    function generateRollupDataChart(aCallFromDrawChart, aStartZoom, aCloseVport) {
        if (aCallFromDrawChart == null) {
            aCallFromDrawChart = false;
        }
        gData = [];
        gData.columns = ['date'];
        gData.types = ['DATETIME'];
        gData.counts = [];
        gData.lengths = [];
        gData.interval = $.extend(true, {}, gInterval);

        sLimit = gLimit;
        if (gUnit != '') {
            sLimit = 0;
        }

        var sAjaxProcess = [];
        for (var i = 0; i < gTagSets.length; i++) {
            var sTag = gTagSets[i].tag_names;
            var sTable = gTagSets[i].table;
            var sCol = gTagSets[i].calculation_mode.toLowerCase();
            //var sUrl = '/machiot-rest-api/datapoints/calculated/' + sTag + '/' + gBgn.substring(0,19) + '/' + gEnd.substring(0,19) + '/' + sCol + '/' + sLimit + '/' + gInterval.type + '/' + gInterval.value;
            //sUrl += setServerInfoParams(gServerInfo);
            //sAjaxProcess.push(callRollupDataAjax(sUrl));
            var sUrl = '/machiot-rest-api/datapoints/calculated';
            var sTemp1 = {
                TagNames: sTag,
                Start: gBgn.substring(0, 19),
                End: gEnd.substring(0, 19),
                CalculationMode: sCol,
                Count: sLimit,
                IntervalType: gInterval.type,
                IntervalValue: gInterval.value,
                table: sTable,
            };
            if (gParams.hasOwnProperty('sec_rollup') && gParams.sec_rollup.hasOwnProperty(sTable)) {
                sTemp1['sec_rollup_exist'] = gParams.sec_rollup[sTable];
            }
            var sTemp2 = setServerInfoParams(gServerInfo);
            var sData = $.extend({}, sTemp1, sTemp2);
            sAjaxProcess.push(callRollupDataAjax(sUrl, sData));
        }

        $(gMainDiv + ' .wrap-loading').height(
            $(gMainDiv + ' ._maindiv').outerHeight(true) + ($(gMainDiv + ' ._detaildiv').css('display') == 'none' ? 0 : $(gMainDiv + ' ._detaildiv').outerHeight(true))
        );
        $(gMainDiv + ' .wrap-loading').css('display', 'block');
        $(gMainDiv + ' ._title_sm_btn').css('display', 'none');
        $(gMainDiv + ' ._vport_move_btn').removeClass('vport-btn-normal-disable');

        var sStartZoom = null;
        if (aStartZoom != null) {
            sStartZoom = $.extend(true, {}, aStartZoom);
        }
        var sCloseVport = false;
        if (aCloseVport != null) {
            sCloseVport = aCloseVport;
            sStartZoom = null;
        }

        var sCallFromDrawChart = aCallFromDrawChart;
        $.when.apply(this, sAjaxProcess).always(function () {
            var sOldStartWithZoom = gStartWithVPort;
            if (sCloseVport == true) {
                gStartWithVPort = false;
            }
            processQueriedData();
            if (sStartZoom != null) {
                if (sStartZoom.begin < 0 && sStartZoom.end < 0 && $(gMainDiv + ' ._viewport').css('display') != 'none') {
                    execBrushed(null, null); // generate all gSeriesData.  gIsDrilledChart is already 0;
                    $(gMainDiv + ' ._viewport').css('display', 'none');
                    handleMouseOver();
                    storeZoomInfomation();
                } else {
                    var sBgnX = sStartZoom.begin;
                    var sEndX = sStartZoom.end;
                    $(gMainDiv + ' ._viewport').css('display', 'block');
                    gGVport.select('.viewarea').call(gViewport.move, [sBgnX, sEndX]);
                }
            } else if (sCallFromDrawChart && gStartWithVPort && gGVport != null) {
                var sBgnX = Math.ceil(gVportInnerWidth * 0.8);
                var sEndX = gVportInnerWidth;
                $(gMainDiv + ' ._viewport').css('display', 'block');
                gGVport.select('.viewarea').call(gViewport.move, [sBgnX, sEndX]);
            } else {
                storeZoomInfomation();
            }
            gStartWithVPort = sOldStartWithZoom;

            if (gRawChartThresholdParam > 0 && gRawChartThresholdParam < 1) {
                var sTotalCount = gData.counts.reduce(function (a, b) {
                    return a + b;
                }, 0);
                gRawChartThreshold = Math.ceil(sTotalCount * gRawChartThresholdParam);
            } else if (gRawChartThresholdParam == 0) {
                var sTotalCount = gData.counts.reduce(function (a, b) {
                    return a + b;
                }, 0);
                var sLength = gData.lengths.reduce(function (a, b) {
                    return a + b;
                }, 0);
                if (sLength > 0) {
                    gRawChartThreshold = Math.ceil((sTotalCount / sLength) * gData.lengths.length * 1.5);
                }
            }
            if (sCloseVport == true) {
                $(gMainDiv + ' ._viewport').css('display', 'none');
            }

            $(gMainDiv + ' .wrap-loading').css('display', 'none');
        });
    }

    function callRollupDataAjax(aUrl, aData) {
        var sUrl = aUrl;
        return $.ajax({
            url: sUrl,
            type: 'GET',
            dataType: 'json',
            timeout: gTimeOut,
            data: aData,
            error: function (request, status, error) {
                ajaxErrorProcess(request, status, error, gTimeOut, sUrl);
            },
            success: function (d) {
                if (d.error_code != 0) {
                    alert(d.ErrorMessage);
                } else {
                    var sTotalCount = 0;
                    for (var i = 0; i < d.Data.length; i++) {
                        var sDatas = d.Data[i].Samples;
                        var sDType = d.Data[i].DataType;
                        var sError = d.Data[i].error_code;
                        var sTagNm = d.Data[i].TagName;
                        var sTable = d.Data[i].hasOwnProperty('Table') ? d.Data[i].Table : 'TAG';
                        var sCMode = '';
                        if (d.Data[i].hasOwnProperty('CalculationMode')) {
                            sCMode = d.Data[i].CalculationMode;
                        }

                        if (sError != 0) {
                            console.log(
                                'Error information : ' +
                                    sTagNm +
                                    ', Error Code = ' +
                                    sError +
                                    (d.Data[i].hasOwnProperty('ErrorMessage') ? ', Error Msg = ' + d.Data[i].ErrorMessage : '')
                            );
                            continue;
                        }
                        var sRes = sDatas.map(function (d) {
                            sTotalCount += d.Quality;
                            return { key: sTagNm, table: sTable, mode: sCMode, date: d.TimeStamp, value: d.Value, count: d.Quality };
                        });

                        gData.columns.push(sTagNm);
                        gData.types.push(sDType);
                        gData.counts.push(sTotalCount);
                        gData.lengths.push(sRes.length);
                        gData.push(sRes);
                    }
                }
            },
        });
    }

    function processQueriedData() {
        if (gData.length > 0) {
            $(gMainDiv + ' ._vport_range_bgn').text(gBgn.substring(0, 19));
            $(gMainDiv + ' ._vport_range_end').text(gEnd.substring(0, 19));

            generateData(gBgn.substring(0, 19), gEnd.substring(0, 19), gData, 0); // generate gSeriesData
            gVPortSeries = $.extend(true, [], gSeriesData); // Deep copy array for Zoom view port
            if (gSeriesData.length > 0) {
                chartProcess();
            }
        } else {
            d3.select(gMainDiv).select('._chartdiv').select('svg').remove();
            $(gMainDiv + ' ._chartdiv').height(gHeight);

            $(gMainDiv + ' ._detaildiv').css('display', 'none');
            if (gStartWithVPort) {
                $(gMainDiv + ' ._viewport').css('display', 'block');
            } else {
                $(gMainDiv + ' ._viewport').css('display', 'none');
            }
            //$(gMainDiv + ' ._legenddiv').html('');
            //$(gMainDiv + ' ._legendbottom').html('');
        }
    }

    function generateData(aBgn, aEnd, aData, aIsDrilledChart, aLimit, aCallFromBrush) {
        if (aIsDrilledChart == null) {
            aIsDrilledChart = -1; // -1: not set gIsDrilledChart
        }
        if (aIsDrilledChart > -1) {
            gIsDrilledChart = aIsDrilledChart;
        }
        if (aLimit == null) {
            if (gIsDrilledChart != 2) {
                // 0: rollup chart, 1: drill down chart, 2: raw data chart
                aLimit = gLimit;
            } else {
                aLimit = gRawChartLimit;
            }
        }
        if (aCallFromBrush == null) {
            aCallFromBrush = false;
        }

        var sBgn = '';
        var sEnd = '';
        if (typeof aBgn == 'string') {
            sBgn = aBgn;
            if (aBgn.length > 19) {
                aBgn = parseTime(aBgn);
            } else {
                aBgn = d3.timeParse('%Y-%m-%d %H:%M:%S')(aBgn);
            }
        } else {
            sBgn = formatTime(aBgn);
        }
        if (typeof aEnd == 'string') {
            sEnd = aEnd;
            if (aEnd.length > 19) {
                aEnd = parseTime(aEnd);
            } else {
                aEnd = d3.timeParse('%Y-%m-%d %H:%M:%S')(aEnd);
            }
        } else {
            sEnd = formatTime(aEnd);
        }
        if (gIsDrilledChart != 2) {
            // 0: rollup chart, 1: drill down chart, 2: raw data chart
            gGenerateBgn = aBgn;
            gGenerateEnd = aEnd;

            sBgn = sBgn.substring(0, 19);
            sEnd = sEnd.substring(0, 19);
        } else {
            //gGenerateBgn = parseFloat( d3.timeFormat('%H%M%S.%L')(aBgn) );         // convert to float(for raw data chart X axis value)
            //gGenerateEnd = parseFloat( d3.timeFormat('%H%M%S.%L999999')(aEnd) );
            gGenerateBgn = (aBgn.getTime() - gRawDataBaseTime.getTime()) / 1000;
            gGenerateEnd = (aEnd.getTime() - gRawDataBaseTime.getTime()) / 1000 + 0.000999999;
        }

        if (gTags == '') {
            if (aBgn === null && aEnd === null) {
                gSeriesData = aData.columns.slice(1).map(function (key, i) {
                    return aData.map(function (d) {
                        return {
                            key: key,
                            table: 'TAG',
                            use_y2: 'N',
                            alias: '',
                            weight: 1.0,
                            mode: 'cnt',
                            name: 'series_' + i,
                            date: parseTime(d.date),
                            value: d[key],
                            count: d[key],
                        };
                    });
                });
            } else {
                var sTemp = aData.filter(function (d) {
                    sTmp = parseTime(d.date);
                    return (aBgn <= sTmp || aBgn === null) && (aEnd >= sTmp || aEnd === null);
                });

                gSeriesData = aData.columns.slice(1).map(function (key, i) {
                    return sTemp.map(function (d) {
                        return {
                            key: key,
                            table: 'TAG',
                            use_y2: 'N',
                            alias: '',
                            weight: 1.0,
                            mode: 'cnt',
                            name: 'series_' + i,
                            date: parseTime(d.date),
                            value: d[key],
                            count: d[key],
                        };
                    });
                });
            }
        } else {
            gSeriesData = [];
            var sSeriesUsed = gSeriesName.map(function (d, i) {
                return false;
            }); // for check gSeriesName is used.
            if (gIsDrilledChart != 2) {
                // 0: rollup chart, 1: drill down chart, 2: raw data chart
                for (var i = 0; i < aData.length; i++) {
                    var sIdx = getSeriesId(aData[i], sSeriesUsed, gSeriesName);
                    var sSeriesName = 'series_' + (sIdx < 0 ? '' : sIdx.toString());
                    var sTemp = aData[i].map(function (d) {
                        return {
                            key: d.key,
                            table: d.table,
                            use_y2: gUseY2[sIdx],
                            alias: gAlias[sIdx],
                            weight: gWeight[sIdx],
                            mode: d.mode,
                            name: sSeriesName,
                            //date: parseTime( d.date.substring(0,19) + ',' + d.date.substring(20,23) ),
                            date: parseTime(d.date.substring(0, 19) + ',' + (d.date.substring(20, 23) == '' ? '000' : d.date.substring(20, 23))),
                            value: d.value,
                            count: d.count,
                        };
                    });
                    gSeriesData.push(
                        sTemp.filter(function (d) {
                            return (aBgn <= d.date || aBgn === null) && (aEnd >= d.date || aEnd === null);
                        })
                    );
                }
            } else {
                var sDateMax = 0; // for adjust for raw chart (raw data chart can not draw all range)
                var sSeriesNames = gSeriesName.map(function (d) {
                    return d.substring(0, d.lastIndexOf('(')) + '(raw)';
                });
                for (var i = 0; i < aData.length; i++) {
                    var sIdx = getSeriesId(aData[i], sSeriesUsed, sSeriesNames);
                    var sSeriesName = 'series_' + (sIdx < 0 ? '' : sIdx.toString());
                    var sTemp = aData[i].map(function (d) {
                        //var sDate = parseTime( d.date.substring(0,19) + ',' + d.date.substring(20,23) );
                        var sDate = parseTime(d.date.substring(0, 19) + ',' + (d.date.substring(20, 23) == '' ? '000' : d.date.substring(20, 23)));
                        var sInt = Math.floor((sDate.getTime() - gRawDataBaseTime.getTime()) / 1000);
                        var sNano = '0.' + (d.date.substring(20, 23) == '' ? '000' : d.date.substring(20, 23));
                        sNano += d.date.substring(24, 27) == '' ? '000' : d.date.substring(24, 27);
                        sNano += d.date.substring(28, 31) == '' ? '000' : d.date.substring(28, 31);
                        //var sTmp = sInt + parseFloat( '0.' + d.date.substring(20,23) + d.date.substring(24,27) + d.date.substring(28,31) );
                        var sTmp = sInt + parseFloat(sNano);
                        return {
                            key: d.key,
                            table: d.table,
                            use_y2: gUseY2[sIdx],
                            alias: gAlias[sIdx],
                            weight: gWeight[sIdx],
                            mode: d.mode,
                            name: sSeriesName,
                            date: sTmp,
                            datetime: sDate,
                            dateStr: d.date,
                            value: d.value,
                            count: d.count,
                        };
                    });
                    gSeriesData.push(
                        sTemp.filter(function (d) {
                            return (aBgn <= d.datetime || aBgn === null) && (aEnd >= d.datetime || aEnd === null);
                        })
                    );
                    if (gSeriesData[i].length > 0 && sDateMax < gSeriesData[i][gSeriesData[i].length - 1].date) {
                        // for adjust for raw chart (raw data chart can not draw all range)
                        sDateMax = gSeriesData[i][gSeriesData[i].length - 1].date;
                    }
                }
                if (aLimit > 0 && sDateMax > 0) {
                    gGenerateEnd = sDateMax; // for adjust for raw chart (raw data chart can not draw all range)
                    sEnd = formatTime(gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000));

                    if (!aCallFromBrush) {
                        var sBgnTime = gRawDataBaseTime.getTime() + Math.floor(gGenerateBgn * 1000);
                        var sEndTime = gRawDataBaseTime.getTime() + Math.floor(gGenerateEnd * 1000);
                        var sBgnX = gXVport(sBgnTime);
                        var sEndX = gXVport(sEndTime);
                        if (sEndX - sBgnX < 1) {
                            sEndX = sBgnX + 1;
                        }
                        gSkipDataWork = true; // Skip generate data on vport move event.
                        gGVport.select('.viewarea').call(gViewport.move, [sBgnX, sEndX]);
                    }
                }
            }
        }
        if (gUseNormalize == 'Y' && gSeriesData.length > 0) {
            sMinArray = [];
            sMaxArray = [];
            $.each(gSeriesData, function (index, data) {
                if (data.length == 0) {
                    return true;
                }
                var sTempIndex = data[0].name.replace('series_', '');
                sMinArray[sTempIndex] = d3.min(data, function (val) {
                    return val.value;
                });
                sMaxArray[sTempIndex] = d3.max(data, function (val) {
                    return val.value;
                });
            });
            gMinArr = $.extend(true, [], sMinArray);
            gMaxArr = $.extend(true, [], sMaxArray);
        }
        gBgnChart = sBgn;
        gEndChart = sEnd;
        gChartInterval = { type: '', value: 0 };
        var sRangeText = sBgn + ' ~ ' + sEnd;
        if (aData.hasOwnProperty('interval')) {
            sRangeText += ' ( interval : ' + aData.interval.value.toString() + ' ' + aData.interval.type + ' )';
            gChartInterval.type = aData.interval.type;
            gChartInterval.value = aData.interval.value;
        }
        $(gMainDiv + ' ._chartrangetext').text(sRangeText);
    }

    function getSeriesId(aArray, aSeriesUsed, aSeriesName) {
        var sIdx = -1;
        if (aArray.length == 0) {
            return sIdx;
        }
        var sSeriesTitle = '';
        if (gIsDrilledChart != 2) {
            // 0: rollup chart, 1: drill down chart, 2: raw data chart
            sSeriesTitle = aArray[0].key + '(' + aArray[0].mode + ')';
        } else {
            sSeriesTitle = aArray[0].key + '(raw)';
        }

        do {
            sIdx = aSeriesName.indexOf(sSeriesTitle, sIdx + 1); // (find title, start index)
        } while (sIdx >= 0 && aSeriesUsed[sIdx] == true);

        if (sIdx >= 0) {
            aSeriesUsed[sIdx] = true;
        }
        return sIdx;
    }
    //////////////// functions for generate Chart (end) /////////////////

    //////////////// functions for Chart Variables (begin) //////////////
    function calcQueryTime(aCallBack) {
        gNow = new Date();

        var sTmpBgn = gBgnParam;
        var sTmpEnd = gEndParam;

        if (sTmpBgn == '' && sTmpEnd == '' && gTagSets.length > 0) {
            var sAjaxProcess = [];
            if (gUseTagMinMax) {
                for (var i = 0; i < gTagSets.length; i++) {
                    var sTag = gTagSets[i].tag_names;
                    var sTable = gTagSets[i].table;
                    sAjaxProcess.push(getMinMaxDate(sTag, gTimeOut, gInternalTimeRangeSet, gServerInfo, sTable));
                }
            } else {
                var sTable = gTagSets.length > 0 ? gTagSets[0].table : 'TAG';
                sAjaxProcess.push(getMinMaxDate('', gTimeOut, gInternalTimeRangeSet, gServerInfo, sTable));
            }

            $(gMainDiv + ' .wrap-loading').height(
                $(gMainDiv + ' ._maindiv').outerHeight(true) + ($(gMainDiv + ' ._detaildiv').css('display') == 'none' ? 0 : $(gMainDiv + ' ._detaildiv').outerHeight(true))
            );
            $(gMainDiv + ' .wrap-loading').css('display', 'block');
            gInternalTimeRangeSet.begin = '';
            gInternalTimeRangeSet.end = '';
            $.when.apply(this, sAjaxProcess).always(function () {
                gBgn = gInternalTimeRangeSet.begin;
                gEnd = gInternalTimeRangeSet.end;

                if (gBgn == '' || gEnd == '') {
                    $.when(getMinMaxDate('', gTimeOut, gInternalTimeRangeSet, gServerInfo)).always(function () {
                        gBgn = gInternalTimeRangeSet.begin;
                        gEnd = gInternalTimeRangeSet.end;
                        if (gBgn == '' || gEnd == '') {
                            setNowTime();
                        }
                        $(gMainDiv + ' ._chartdiv').data('bgn', gBgnParam);
                        $(gMainDiv + ' ._chartdiv').data('end', gEndParam);
                        $(gMainDiv + ' ._chartdiv').data('bgn_date', gBgn);
                        $(gMainDiv + ' ._chartdiv').data('end_date', gEnd);

                        $(gMainDiv + ' .wrap-loading').css('display', 'none');
                        aCallBack();
                    });
                } else {
                    $(gMainDiv + ' ._chartdiv').data('bgn', gBgnParam);
                    $(gMainDiv + ' ._chartdiv').data('end', gEndParam);
                    $(gMainDiv + ' ._chartdiv').data('bgn_date', gBgn);
                    $(gMainDiv + ' ._chartdiv').data('end_date', gEnd);

                    $(gMainDiv + ' .wrap-loading').css('display', 'none');
                    aCallBack();
                }
            });
        } else {
            if (sTmpBgn == '' && sTmpEnd == '') {
                setNowTime();
            } else if (sTmpBgn == '') {
                gEnd = calcTimeNow(sTmpEnd, false);
                var sTemp = new Date(gEnd.substring(0, 19).replace(' ', 'T'));
                sTemp.setHours(sTemp.getHours() - 1);
                sTemp.setSeconds(sTemp.getSeconds() + 1);
                gBgn = DateToString(sTemp);
            } else if (sTmpEnd == '') {
                gBgn = calcTimeNow(sTmpBgn, true);
                var sTemp = new Date(gBgn.substring(0, 19).replace(' ', 'T'));
                sTemp.setHours(sTemp.getHours() + 1);
                sTemp.setSeconds(sTemp.getSeconds() - 1);
                gEnd = DateToString(sTemp);
            } else {
                gBgn = calcTimeNow(sTmpBgn, true); // begin = true
                gEnd = calcTimeNow(sTmpEnd, false);
            }

            $(gMainDiv + ' ._chartdiv').data('bgn', gBgnParam);
            $(gMainDiv + ' ._chartdiv').data('end', gEndParam);
            $(gMainDiv + ' ._chartdiv').data('bgn_date', gBgn);
            $(gMainDiv + ' ._chartdiv').data('end_date', gEnd);

            aCallBack();
        }
    }

    function setNowTime() {
        var sTemp = gNow;

        gEnd = DateToString(sTemp);

        sTemp.setHours(sTemp.getHours() - 1);
        sTemp.setSeconds(sTemp.getSeconds() + 1);

        gBgn = DateToString(sTemp);
    }

    function calcTimeNow(aTime, aIsBgn) {
        var sRet = new Date(gNow.getTime()); // gNow;

        if (aTime.indexOf('now') < 0) {
            if (aTime.length < 11) {
                // set datetime length
                sRet = aTime.slice(0, 10) + ' 00:00:00';
            } else if (aTime.length < 14) {
                sRet = aTime.slice(0, 10) + ' ' + aTime.slice(11, 13) + ':00:00';
            } else if (aTime.length < 17) {
                sRet = aTime.slice(0, 10) + ' ' + aTime.slice(11, 16) + ':00';
            } else {
                sRet = aTime.slice(0, 10) + ' ' + aTime.slice(11, 19);
            }

            return sRet;
        }

        var sTime = splitTimeNow(aTime);

        if (!sTime.success) {
            return DateToString(sRet);
        }

        var sMoment = moment(sRet);

        if (sTime.splited !== '') {
            // /d, /w, /M, /y
            var sUnit = getUnitStr(sTime.splited);

            if (aIsBgn) {
                sRet = sMoment.startOf(sUnit);
            } else {
                sRet = sMoment.endOf(sUnit);
            }

            if (sUnit === 'week') {
                sRet.add(1, 'days'); // because beginning of a week is Sunday, add another day
            }
        } else {
            sRet = sMoment; // make sRet moment object
        }

        var sUnit = getUnitStr(sTime.unit);

        if (sUnit !== '') {
            if (sTime.sign < 0) {
                sRet.subtract(sTime.value, sUnit + 's');
                sRet.subtract(1, 'seconds'); // now-? -> +1 second (because of range)
            } else {
                sRet.add(sTime.value, sUnit + 's');
                sRet.add(1, 'seconds'); // now+? -> -1 second
            }
        }

        return DateToString(sRet.toDate());
    }

    function calcInterval(aBgn, aEnd, aWidth) {
        var sBgn = new Date(aBgn.substring(0, 19).replace(' ', 'T'));
        var sEnd = new Date(aEnd.substring(0, 19).replace(' ', 'T'));
        var sDiff = sEnd.getTime() - sBgn.getTime();
        var sSecond = Math.floor(sDiff / 1000);
        var sCalc = sSecond / (aWidth / gTickPixels);

        var sRet = { type: 'sec', value: 1 };
        if (sCalc > 60 * 60 * 12) {
            // interval > 12H
            sRet.type = 'day';
            sRet.value = Math.ceil(sCalc / (60 * 60 * 24));
        } else if (sCalc > 60 * 60 * 6) {
            // interval > 6H
            sRet.type = 'hour';
            sRet.value = 12;
        } else if (sCalc > 60 * 60 * 3) {
            // interval > 3H
            sRet.type = 'hour';
            sRet.value = 6;
        } else if (sCalc > 60 * 60) {
            // interval > 1H
            sRet.type = 'hour';
            sRet.value = Math.ceil(sCalc / (60 * 60));
        } else if (sCalc > 60 * 30) {
            // interval > 30M
            sRet.type = 'hour';
            sRet.value = 1;
        } else if (sCalc > 60 * 20) {
            // interval > 20M
            sRet.type = 'min';
            sRet.value = 30;
        } else if (sCalc > 60 * 15) {
            // interval > 15M
            sRet.type = 'min';
            sRet.value = 20;
        } else if (sCalc > 60 * 10) {
            // interval > 10M
            sRet.type = 'min';
            sRet.value = 15;
        } else if (sCalc > 60 * 5) {
            // interval > 5M
            sRet.type = 'min';
            sRet.value = 10;
        } else if (sCalc > 60 * 3) {
            // interval > 3M
            sRet.type = 'min';
            sRet.value = 5;
        } else if (sCalc > 60) {
            // interval > 1M
            sRet.type = 'min';
            sRet.value = Math.ceil(sCalc / 60);
        } else if (sCalc > 30) {
            // interval > 30S
            sRet.type = 'min';
            sRet.value = 1;
        } else if (sCalc > 20) {
            // interval > 20S
            sRet.type = 'sec';
            sRet.value = 30;
        } else if (sCalc > 15) {
            // interval > 15S
            sRet.type = 'sec';
            sRet.value = 20;
        } else if (sCalc > 10) {
            // interval > 10S
            sRet.type = 'sec';
            sRet.value = 15;
        } else if (sCalc > 5) {
            // interval > 5S
            sRet.type = 'sec';
            sRet.value = 10;
        } else if (sCalc > 3) {
            // interval > 3S
            sRet.type = 'sec';
            sRet.value = 5;
        } else {
            sRet.type = 'sec';
            sRet.value = Math.ceil(sCalc);
        }

        if (sRet.value < 1) {
            sRet.value = 1;
        }
        return sRet;
    }
    //////////////// functions for Chart Variables (end) ////////////////

    //////////////// Main chart function (begin) //////////////////////////
    function drawMainChart() {
        if (gAreas !== null) {
            gAreas.remove();
        }
        if (gSeries !== null) {
            gSeries.remove();
        }
        if (gPoints !== null) {
            gPoints.remove();
        }
        if (gFocus !== null) {
            gFocus.remove();
        }
        if (gShowLegend == 'B') {
            $(gMainDiv + ' ._legenddiv').css('display', 'none');
            d3.select(gMainDiv).select('._legendbottom').html('');

            drawLegendBottom();
        } else {
            $(gMainDiv + ' ._legendbottom').css('display', 'none');
            d3.select(gMainDiv).select('._legenddiv').html('');

            $(gMainDiv + ' ._legenddiv').css('width', gLegendWidth);
            $(gMainDiv + ' ._legenddiv').css('max-height', gHeight);
            $(gMainDiv + ' ._legenddiv').css('top', d3.select(gMainDiv).select('._chartheader').node().getBoundingClientRect().height);
            if (gLegendWidth <= gLegendRightMargin) {
                $(gMainDiv + ' ._legenddiv').css('display', 'none');
            } else {
                drawLegend();
            }
        }
        if (gSeriesData.length <= 0) {
            return;
        }

        gAreas = gG
            .selectAll('.areas')
            .data(gSeriesData)
            .enter()
            .append('g')
            .attr('id', function (d) {
                return '_a' + (d.length > 0 ? d[0].name : '_no_data');
            })
            .attr('class', 'areas');
        gArea = gAreas
            .append('path')
            .attr('class', 'area area_' + gTargetDiv)
            .style('fill', function (d) {
                return d.length > 0 ? gZ(d[0].name) : '#5ca3f2';
            })
            .attr('d', gAreaGen);

        gSeries = gG
            .selectAll('.serie')
            .data(gSeriesData)
            .enter()
            .append('g')
            .attr('id', function (d) {
                return '_p' + (d.length > 0 ? d[0].name : '_no_data');
            })
            .attr('class', 'serie');
        gSerie = gSeries
            .append('path')
            .attr('class', 'line line_' + gTargetDiv)
            .style('stroke', function (d) {
                return d.length > 0 ? gZ(d[0].name) : '#5ca3f2';
            })
            .attr('d', gLineGen);

        if (gUseNormalize == 'N') {
            gPoints = gSeries
                .selectAll('.point')
                .data(function (d) {
                    return d;
                })
                .enter()
                .append('circle')
                .attr('class', 'point')
                .style('stroke', function (d) {
                    return gZ(d.name);
                })
                .style('fill', function (d) {
                    return gZ(d.name);
                })
                .attr('r', gPointSize)
                .attr('cx', function (d) {
                    return gX(d.date);
                })
                .attr('cy', function (d) {
                    return d.use_y2 != 'Y' ? gY(d.value) : gY2(d.value);
                });
        } else {
            gPoints = gSeries
                .selectAll('.point')
                .data(function (d) {
                    return d;
                })
                .enter()
                .append('circle')
                .attr('class', 'point')
                .style('stroke', function (d) {
                    return gZ(d.name);
                })
                .style('fill', function (d) {
                    return gZ(d.name);
                })
                .attr('r', gPointSize)
                .attr('cx', function (d) {
                    return gX(d.date);
                })
                .attr('cy', function (d) {
                    var sTempIndex = d.name.replace('series_', '');
                    return d.use_y2 != 'Y'
                        ? gY(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight)
                        : gY2(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight);
                });
        }
        togglePoint(gShowPoint);

        gFocus = gSeries
            .append('circle')
            .attr('class', 'focus')
            .attr('id', function (d) {
                return 'ci' + (d.length > 0 ? d[0].name : '_no_data');
            })
            .style('fill', function (d) {
                return d.length > 0 ? gZ(d[0].name) : '#5ca3f2';
            })
            .style('stroke', function (d) {
                return d.length > 0 ? gZ(d[0].name) : '#5ca3f2';
            })
            .style('display', 'none')
            .attr('r', gPointSize + 2);
        /*
        if (gShowLegend == 'B')
        {
            drawLegendBottom();
        }
        else
        {
            $(gMainDiv + ' ._legenddiv').css('width', gLegendWidth);
            $(gMainDiv + ' ._legenddiv').css('max-height', gHeight);
            $(gMainDiv + ' ._legenddiv').css('top', d3.select(gMainDiv).select('._chartheader').node().getBoundingClientRect().height);
            if (gLegendWidth <= gLegendRightMargin)
            {
                $(gMainDiv + ' ._legenddiv').css('display', 'none');
            }
            else
            {
                drawLegend();
            }
        }
*/
    }

    function drawAxis(aOpt) {
        if (aOpt.toUpperCase() == 'X' || aOpt.toUpperCase() == 'A') {
            if (gXaxis !== null) {
                gG.selectAll('.axis-x').remove();
            }
            gXaxis = gG
                .append('g')
                .attr('class', 'axis axis-x')
                .attr('transform', 'translate(0, ' + gInnerHeight + ')')
                .call(gXaxisCall);
            if (gShowXAxisTickLine) {
                gXaxis.selectAll('.tick line').attr('y2', -1 * gInnerHeight);
            }
        }

        if (aOpt.toUpperCase() == 'Y' || aOpt.toUpperCase() == 'A') {
            if (gYaxis !== null) {
                gG.selectAll('.axis-y').remove();
            }
            gYaxis = gG.append('g').attr('class', 'axis axis-y').call(gYaxisCall);
            gYaxis.append('line').attr('class', 'axis-line').attr('x1', 1).attr('y1', 0).attr('x2', 1).attr('y2', gInnerHeight);
            if (gShowYAxisTickLine) {
                gYaxis.selectAll('.tick line').attr('x2', gInnerWidth);
            }
            gYaxis.selectAll('text').attr('x', -5); // Adjust the spacing between axis-line and text.(default value = -9)

            if (gUseY2Axis) {
                if (gYaxis2 !== null) {
                    gG.selectAll('.axis-y2').remove();
                }
                if (gUseRightY2) {
                    gYaxis2 = gG
                        .append('g')
                        .attr('class', 'axis axis-y2')
                        .attr('transform', 'translate(' + gInnerWidth.toString() + ', 0)')
                        .call(gYaxisCall2);
                    gYaxis2.append('line').attr('class', 'axis-line').attr('x1', 1).attr('y1', 0).attr('x2', 1).attr('y2', gInnerHeight);
                    if (gShowYAxisTickLine2) {
                        gYaxis2.selectAll('.tick line').attr('x2', gInnerWidth * -1);
                    }
                    gYaxis2.selectAll('text').attr('x', 5); // Adjust the spacing between axis-line and text.(default value = 9)
                } else {
                    gYaxis2 = gG
                        .append('g')
                        .attr('class', 'axis axis-y2')
                        .attr('transform', 'translate(' + (gY2LeftAdjust * -1).toString() + ', 0)')
                        .call(gYaxisCall2);

                    gYaxis2.append('line').attr('class', 'axis-line').attr('x1', 1).attr('y1', 0).attr('x2', 1).attr('y2', gInnerHeight);

                    if (gShowYAxisTickLine2) {
                        gYaxis2
                            .selectAll('.tick line')
                            .attr('transform', 'translate(' + gY2LeftAdjust.toString() + ', 0)')
                            .attr('x2', gInnerWidth);
                    }
                    gYaxis2.selectAll('text').attr('x', -5); // Adjust the spacing between axis-line and text.(default value = -9)
                }
            }
        }
    }

    function togglePoint(aShowNode) {
        if (aShowNode) {
            gSeries.selectAll('.point').style('display', null);
        } else {
            gSeries.selectAll('.point').style('display', 'none');
        }
    }

    function handleMouseOver() {
        if (gFocus == null) {
            return;
        }
        gFocus.style('display', null);
        gVLine.style('display', null);
        $(gMainDiv + ' ._graphtooltip').css('display', 'block');
    }

    function handleMouseOut() {
        if (gFocus == null) {
            return;
        }
        gFocus.style('display', 'none');
        gVLine.style('display', 'none');
        $(gMainDiv + ' ._graphtooltip').css('display', 'none');
    }

    function handleMouseMove() {
        var x0 = gX.invert(d3.mouse(this)[0]),
            y0 = gY.invert(d3.mouse(this)[1]), // [no edit] #1: y0 is converted using gY() below. (refer #2)
            idx = 0,
            d = 0,
            d0 = 0,
            d1 = 0,
            sHtml = '',
            sDate = null,
            sDateStr = '';

        sHtml = '<table class="tooltip_table"><tbody>';
        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length <= 0) {
                continue;
            }
            idx = bisectDate(gSeriesData[i], x0, 1);
            if (idx >= gSeriesData[i].length) {
                idx = gSeriesData[i].length - 1;
            }

            if (idx < 1) {
                d0 = gSeriesData[i][idx];
            } else {
                d0 = gSeriesData[i][idx - 1];
            }
            d1 = gSeriesData[i][idx];
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;

            if (sDate == null || Math.abs(x0 - sDate) > Math.abs(x0 - d.date)) {
                sDate = d.date;
                if (d.hasOwnProperty('dateStr')) {
                    sDateStr = d.dateStr;
                } else {
                    sDateStr = formatTime(sDate);
                }
            }
        }
        sHtml += '<tr><td id="_tooltip_date" colspan=2><bold>' + sDateStr + '</bold></td></tr>';

        //for (var i = 0; i < gSeriesData.length; i++)
        //{
        //    if (gSeries == null)
        //    {
        //    }
        //    if (gSeriesData[i].length <= 0)
        //    {
        //        continue;
        //    }
        for (var k = 0; k < gSeriesName.length; k++) {
            var sSerieName = 'series_' + k.toString();
            var i = gSeriesData.findIndex(function (sArray) {
                return sArray.length > 0 && sArray[0].name == sSerieName;
            });
            if (i < 0) {
                continue;
            }
            idx = bisectDate(gSeriesData[i], x0, 1);
            if (idx >= gSeriesData[i].length) {
                idx = gSeriesData[i].length - 1;
            }

            if (idx < 1) {
                d0 = gSeriesData[i][idx];
            } else {
                d0 = gSeriesData[i][idx - 1];
            }
            d1 = gSeriesData[i][idx];
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            var sId = '#ci' + d.name;

            if (gUseNormalize == 'N') {
                gSeries.select(sId).attr('transform', 'translate(' + gX(d.date) + ',' + (d.use_y2 != 'Y' ? gY(d.value) : gY2(d.value)) + ')');
            } else {
                var sTempIndex = d.name.replace('series_', '');
                gSeries
                    .select(sId)
                    .attr(
                        'transform',
                        'translate(' +
                            gX(d.date) +
                            ',' +
                            (d.use_y2 != 'Y'
                                ? gY(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight)
                                : gY2(((d.value - gMinArr[sTempIndex]) / (gMaxArr[sTempIndex] - gMinArr[sTempIndex])) * 100.0 * d.weight)) +
                            ')'
                    ); // ? gY(d.value*d.weight) : gY2(d.value*d.weight)) + ')');
            }

            var sLp = '_a' + gSeriesData[i][0].name;
            var sTmp = d3
                .select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sLp)
                .style('display');
            if (sTmp == 'none') {
                continue;
            }

            sFmt = ',d';
            if (gData.types[i + 1] == 'FLOAT' || gData.types[i + 1] == 'DOUBLE') {
                sFmt = ',';
            }
            if (formatTime(sDate) == formatTime(d.date)) {
                if (d.alias == '') {
                    sHtml += '<tr style="color:' + gZ(d.name) + ';"><td class="toolName">' + d.key + '(' + d.mode + ') ' + '</td><td>' + d3.format(sFmt)(d.value) + '</td></tr>';
                } else {
                    sHtml += '<tr style="color:' + gZ(d.name) + ';"><td class="toolName">' + d.alias + '</td><td>' + d3.format(sFmt)(d.value) + '</td></tr>';
                }
            } else {
                if (d.alias == '') {
                    sHtml += '<tr style="color:' + gZ(d.name) + ';"><td class="toolName">' + d.key + '(' + d.mode + ') ' + '</td><td>' + ' ' + '</td></tr>';
                } else {
                    sHtml += '<tr style="color:' + gZ(d.name) + ';"><td class="toolName">' + d.alias + '</td><td>' + ' ' + '</td></tr>';
                }
            }
        }

        gG.select('.vline').attr('transform', 'translate(' + gX(x0) + ')');

        sHtml += '</tbody></table>';
        $(gMainDiv + ' ._graphtooltip').html(sHtml);

        //        var sPosL = d3.select(gMainDiv).select('._chartdiv').node().getBoundingClientRect().left;
        //        var sLeft = gX(x0) + gMargin.left + gTooltipMargin + sPosL;
        //        var sLeft = gX(x0) + gMargin.left + gTooltipMargin + gY2LeftAdjust;
        var sPadding = ($(gMainDiv + ' .maindiv').innerWidth() - $(gMainDiv + ' .maindiv').width()) / 2;
        var sLeft = gX(x0) + sPadding + gMargin.left + gTooltipMargin + gY2LeftAdjust;
        var sWid = $(gMainDiv + ' ._graphtooltip').outerWidth();
        if (sLeft + parseInt(sWid) + gMargin.right > gWidth) {
            sLeft = sLeft - parseInt(sWid) - gTooltipMargin * 2;
        }
        $(gMainDiv + ' ._graphtooltip').css('left', sLeft + 'px');

        sPadding = ($(gMainDiv + ' .maindiv').innerHeight() - $(gMainDiv + ' .maindiv').height()) / 2;
        var sPosT = d3.select(gMainDiv).select('._chartheader').node().getBoundingClientRect().height;
        var sTop = gY(y0) + sPadding + gMargin.top + gTooltipMargin + sPosT; // [no edit] #2: y0 was calculated using gY.invert(). (refer #1)
        var sHig = $(gMainDiv + ' ._graphtooltip').outerHeight();
        if (sTop + parseInt(sHig) + gMargin.bottom > gHeight + sPosT) {
            sTop = sTop - parseInt(sHig) - gTooltipMargin * 2;
        }
        $(gMainDiv + ' ._graphtooltip').css('top', sTop + 'px');
    }

    function handleClick() {
        if (gTags == '') {
            return;
        }
        executeClick(d3.mouse(this)[0], d3.mouse(this)[1]);
    }

    function executeClick(aX, aY) {
        var x0 = gX.invert(aX),
            y0 = gY.invert(aY), // [no edit] #3: if use_y is 'Y', change value using gY2() below. (refer #4)
            idx = 0,
            d = 0,
            d0 = 0,
            d1 = 0,
            clicked = {},
            timegap = 0;

        if (gIsDrilledChart == 2) {
            // return on raw data chart
            return;
        }

        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length <= 0) {
                continue;
            }
            idx = bisectDate(gSeriesData[i], x0, 1);
            if (idx >= gSeriesData[i].length) {
                idx = gSeriesData[i].length - 1;
            }

            if (idx < 1) {
                d0 = gSeriesData[i][idx];
            } else {
                d0 = gSeriesData[i][idx - 1];
            }
            d1 = gSeriesData[i][idx];
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;
            if (d.use_y2 == 'Y') {
                y0 = gY2.invert(aY); // #4 : y0 was calculated using gY() above. (refer #3)
            }

            var sLp = '_a' + gSeriesData[i][0].name;
            var sTmp = d3
                .select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sLp)
                .style('display');
            if (sTmp == 'none') {
                continue;
            }

            // find nearest point.
            if (clicked.hasOwnProperty('value')) {
                var sVal0 = d.use_y2 != 'Y' ? gY(y0) : gY2(y0);
                var sVal1 = sVal0 - (clicked.use_y2 != 'Y' ? gY(clicked.value) : gY2(clicked.value));
                var sVal2 = sVal0 - (d.use_y2 != 'Y' ? gY(d.value) : gY2(d.value));

                if (Math.abs(sVal1) > Math.abs(sVal2)) {
                    clicked = {}; // init click variable.(= remove 'value' key.)
                }
            }
            if (!clicked.hasOwnProperty('value')) {
                clicked = d;
                timegap = parseInt(Math.abs(d1.date - d0.date) / 1000);
            }
        }
        if (timegap == 0) {
            switch (gChartInterval.type) {
                case 'sec':
                    timegap = gChartInterval.value * 1;
                    break;
                case 'min':
                    timegap = gChartInterval.value * 60;
                    break;
                case 'hour':
                    timegap = gChartInterval.value * (60 * 60);
                    break;
                case 'day':
                    timegap = gChartInterval.value * (60 * 60 * 24);
                    break;
                default:
                    timegap = 1;
            }
        }
        if (timegap > 0) {
            var sClickedDate = formatTime(clicked.date);
            if (gUseDetail == 2) {
                // on click point - 0: not use, 1: show raw data chart, 2: show raw data table
                drawRawDataTable(sClickedDate, clicked.key, timegap, clicked.table);
            } else if (gUseDetail == 1) {
                // on click point - 0: not use, 1: show raw data chart, 2: show raw data table
                $(gMainDiv + ' ._viewport').css('display', 'block');

                var sBgnTime = parseTime(sClickedDate);
                var sEndTime = parseTime(formatTime(sBgnTime));

                if (timegap * 1000 > gRawDataThresholdSecond) {
                    timegap = gRawDataThresholdSecond / 1000;
                }
                sEndTime.setTime(sEndTime.getTime() + timegap * 1000);
                var sBgn = gXVport(sBgnTime);
                var sEnd = gXVport(sEndTime);
                gGVport.select('.viewarea').call(gViewport.move, [sBgn, sEnd]);
            }
        }
    }

    // handle wheel event (for zoom in & zoo out)
    function handleWheelEvent() {
        if (d3.event.type != 'wheel' || d3.select(gMainDiv).select('._viewport').style('display') == 'none') {
            return;
        }
        if (gProcess > 0 || gWheeled != 0) {
            return;
        }
        d3.event.preventDefault();

        var sDY = d3.event.deltaY;
        var sX = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x'));
        var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
        var sVPortWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.overlay').attr('width'));
        var sIncrement = Math.ceil(sVPortWidth * 0.025);

        var sBgn = sX;
        var sEnd = sBgn + sWidth;
        if (sDY < 0) {
            sBgn = sX + sIncrement >= sEnd ? sX + Math.floor(sWidth / 2) : sX + sIncrement;
            sEnd = sBgn + sWidth - sIncrement * 2 < sBgn ? sBgn + 1 : sBgn + sWidth - sIncrement * 2;
            gWheeled = 1; // 0: not in wheel event, 1: zoom in wheel, 2: zoom out wheel
        } else {
            sBgn = sX - sIncrement < 0 ? 0 : sX - sIncrement;
            sEnd = sBgn + sWidth + sIncrement * 2 > sVPortWidth ? sVPortWidth : sBgn + sWidth + sIncrement * 2;
            gWheeled = 2; // 0: not in wheel event, 1: zoom in wheel, 2: zoom out wheel
        }
        gGVport.select('.viewarea').call(gViewport.move, [sBgn, sEnd]);
    }
    //////////////// Main chart function (end) //////////////////////////

    //////////////// Raw Data Table function (begin) //////////////////////////
    function drawRawDataTable(aDate, aTagName, aTimeGap, aTable) {
        if (aTable == null) {
            aTable = 'TAG';
        }
        if (gChartMode == 'M') {
            return;
        }

        var sDirection = 0; // 0=not use, (1=desc,2=asc)
        var sRawLimit = gDetailLimit; // 0 = all
        var sBgnTime = parseTime(aDate);
        var sBgnDate = aDate;
        var sEndTime = parseTime(formatTime(sBgnTime));
        sEndTime.setSeconds(sBgnTime.getSeconds() + aTimeGap - 1);
        var sEndDate = formatTime(sEndTime);

        //var sUrl = '/machiot-rest-api/datapoints/raw/' + aTagName + '/' + sBgnDate.substring(0,19) + '/' + sEndDate.substring(0,19) + '/' + sDirection + '/' + sRawLimit;
        //sUrl += setServerInfoParams(gServerInfo);
        var sUrl = '/machiot-rest-api/datapoints/raw';
        var sTemp1 = { TagNames: aTagName, Start: sBgnDate.substring(0, 19), End: sEndDate.substring(0, 19), Direction: sDirection, Count: sRawLimit, table: aTable };
        var sTemp2 = setServerInfoParams(gServerInfo);
        var sData = $.extend({}, sTemp1, sTemp2);

        $.ajax({
            url: sUrl,
            type: 'GET',
            dataType: 'json',
            timeout: gTimeOut,
            data: sData,
            error: function (request, status, error) {
                //console.log("code:"+request.status+"\n"+"message:"+request.responseText+"\n"+"error:"+error);
                ajaxErrorProcess(request, status, error, gTimeOut, sUrl);
            },
            success: function (d) {
                if (d.error_code != 0) {
                    alert(d.ErrorMessage);
                } else {
                    gCurrentPage = 1;
                    gDetailData = d.Data[0].Samples;

                    if (sBgnDate == sEndDate) {
                        $(gMainDiv + ' ._tableheader').text(aTagName + ' (' + sBgnDate.substring(0, 19) + ')');
                    } else {
                        $(gMainDiv + ' ._tableheader').text(aTagName + ' (' + sBgnDate.substring(0, 19) + ' ~ ' + sEndDate.substring(0, 19) + ')');
                    }
                    writeDetailData();

                    $(gMainDiv + ' ._detaildiv').css('display', 'block');
                }
            },
            beforeSend: function () {
                $(gMainDiv + ' .wrap-loading').height(
                    $(gMainDiv + ' ._maindiv').outerHeight(true) + ($(gMainDiv + ' ._detaildiv').css('display') == 'none' ? 0 : $(gMainDiv + ' ._detaildiv').outerHeight(true))
                );
                $(gMainDiv + ' .wrap-loading').css('display', 'block');
            },
            complete: function () {
                $(gMainDiv + ' .wrap-loading').css('display', 'none');
            },
        });
    }

    function writeDetailData() {
        var sBgnIdx = (gCurrentPage - 1) * gDetailRows;
        var sEndIdx = sBgnIdx + gDetailRows;
        if (sEndIdx > gDetailData.length) {
            sEndIdx = gDetailData.length;
        }

        var sHtml = '';
        for (var i = sBgnIdx; i < sEndIdx; i++) {
            sHtml += '<tr>';
            sHtml += '<td data-toggle="tooltip" title="' + gDetailData[i]['TimeStamp'] + '">' + gDetailData[i]['TimeStamp'] + '</td>';
            sHtml += '<td data-toggle="tooltip" title="' + gDetailData[i]['Value'] + '">' + gDetailData[i]['Value'] + '</td>';
            sHtml += '</tr>';
        }
        $(gMainDiv + ' ._detailtable >tbody').html(sHtml);
        makePagination();
    }

    function makePagination() {
        var sMaxPage = Math.ceil(gDetailData.length / gDetailRows);
        var sHtml = '<li><a href="#" aria-label="First"><span aria-hidden="true">&lt;</span></a></li>';
        for (var i = gCurrentPage - 5 <= 1 ? 1 : gCurrentPage - 5; i <= (gCurrentPage + 5 >= sMaxPage ? sMaxPage : gCurrentPage + 5); i++) {
            if (i == gCurrentPage) {
                sHtml += '<li class="active"><a href="#">' + i + '</a></li>';
            } else {
                sHtml += '<li><a href="#">' + i + '</a></li>';
            }
        }
        sHtml += '<li><a href="#" aria-label="Last"><span aria-hidden="true">&gt;</span></a></li>';
        $(gMainDiv + ' ._respage').html(sHtml);

        $(gMainDiv + ' ._respage > li > a')
            .unbind()
            .click(function () {
                var sText = $(this).text();
                var sMaxPage = Math.ceil(gDetailData.length / gDetailRows);

                if (sText == '<') {
                    if (gCurrentPage > 1) {
                        gCurrentPage = 1;
                        writeDetailData();
                    }
                } else if (sText == '>') {
                    if (gCurrentPage < sMaxPage) {
                        gCurrentPage = sMaxPage;
                        writeDetailData();
                    }
                } else {
                    gCurrentPage = parseInt(sText);
                    writeDetailData();
                }
            });
    }
    //////////////// Raw Data Table function (end) //////////////////////////

    //////////////// Viewport function (begin) //////////////////////////
    function brushend() {
        //if (d3.event !== null && d3.event.sourceEvent !== null)  // mouse movement event
        //{
        //    gSkipDataWork = false;
        //}
        if (gSkipDataWork) {
            gSkipDataWork = false; // Skip generate data on vport move event.
            return;
        }
        if (d3.event.selection === null) {
            gSkipDataWork = true;
            d3.event.selection = [gCrntZoomData.vport_begin, gCrntZoomData.vport_begin + 1]; // set d3.event.selection and process chart
            gGVport.select('.viewarea').call(gViewport.move, d3.event.selection); // just draw selection(not data work = gSkipDataWork = true;)
        } else if (d3.event.selection[0] < 0 || d3.event.selection[1] < 0) {
            // just mouse click
            return;
        }

        if (gTags == '' || !gDrillDownZoom || gResizingWindow) {
            storeZoomInfomation();
            return;
        }

        var sBgnTime = gXVport.invert(d3.event.selection[0]);
        var sEndTime = gXVport.invert(d3.event.selection[1]);
        if (sBgnTime < gXVport.domain()[0]) {
            sBgnTime = gXVport.domain()[0];
        }
        if (sEndTime > gXVport.domain()[1]) {
            sEndTime = gXVport.domain()[1];
        }
        if (sBgnTime > sEndTime) {
            sEndTime.setTime(sBgnTime.getTime() + (gXVport.invert(d3.event.selection[1]) - gXVport.invert(d3.event.selection[0])));
        }
        var sBgnDate = parseTime(formatTime(sBgnTime));
        var sEndDate = parseTime(formatTime(sEndTime));
        if (gUnit == 'min') {
            if (sEndTime.getSeconds() > 30) {
                sEndDate.setMinutes(sEndDate.getMinutes() + 1);
            }
        } else if (gUnit == 'hour') {
            if (sEndTime.getMinutes() > 30) {
                sEndDate.setHours(sEndDate.getHours() + 1);
            }
        } else if (gUnit == 'day') {
            if (sEndTime.getHours() > 12) {
                sEndDate.setDate(sEndDate.getDate() + 1);
            }
        }

        // prevent (begin data == end date)
        if (gIsDrilledChart == 2) {
            // 0: not in wheel event, 1: zoom in wheel, 2: zoom out wheel
            if (formatTime(sBgnDate) == formatTime(sEndDate)) {
                sEndDate.setTime(sBgnDate.getTime() + 1);
            }
        } else {
            if (formatTime(sBgnDate).substring(0, 19) == formatTime(sEndDate).substring(0, 19)) {
                sEndDate.setTime(sBgnDate.getTime() + 1000);
            }
        }
        var sBgnDateStr = formatTime(sBgnDate);
        var sEndDateStr = formatTime(sEndDate);
        var sTempInterval = calcInterval(sBgnDateStr, sEndDateStr, gInnerWidth);

        var sCountArray = null;
        if (gWheeled != 2 && gIsDrilledChart != 2) {
            // 0: not in wheel event, 1: zoom in wheel, 2: zoom out wheel
            sCountArray = gSeriesData;
        } else {
            sCountArray = gVPortSeries;
        }

        var sTotalCount = 0;
        for (var i = 0; i < sCountArray.length; i++) {
            sTotalCount += sCountArray[i].reduce(function (accumulator, value, idx) {
                var sTemp = 0;
                if (value.date >= sBgnDate && value.date <= sEndDate) {
                    sTemp = value.count;
                }
                return accumulator + sTemp;
            }, 0);
        }

        var sDiff = sEndDate.getTime() - sBgnDate.getTime();
        //if ((sTotalCount > 0 && sTotalCount < gRawChartThreshold) || sDiff <= 2000 || (d3.event.selection[1] - d3.event.selection[0]) <= 2)
        if (gRawDataThresholdSecond == 0 && ((sTotalCount > 0 && sTotalCount < gRawChartThreshold) || sDiff <= 2000 || d3.event.selection[1] - d3.event.selection[0] <= 2)) {
            generateRawDataChart(sBgnDateStr, sEndDateStr);
        } else if (gRawDataThresholdSecond > 0 && sDiff <= gRawDataThresholdSecond) {
            generateRawDataChart(sBgnDateStr, sEndDateStr);
        } else if (gTags != '') {
            generateDrillDownChart(sBgnDateStr, sEndDateStr, sTempInterval);
        } else {
            storeZoomInfomation();
        }
    }

    function brushcentered() {
        d3.event.stopImmediatePropagation(); // prevent Brush event
        d3.event.preventDefault(); // prevent text selection

        //var sX = parseInt( d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x') );
        var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
        if (sWidth < 1) {
            sWidth = 1;
        }
        var sX = d3.mouse(this)[0];
        var sBgn = sX - sWidth / 2;
        if (sBgn < 0) {
            sBgn = 0;
        }
        var sEnd = sBgn + sWidth;
        if (sEnd > gVportInnerWidth) {
            sEnd = gVportInnerWidth;
            sBgn = sEnd - sWidth;
        }

        gGVport.select('.viewarea').call(gViewport.move, [sBgn, sEnd]);
    }

    function generateRawDataChart(aBgnDate, aEndDate, aLimit) {
        if (aLimit == null) {
            aLimit = gRawChartLimit;
        }

        var sLimit = aLimit;
        var sBgnDate = aBgnDate;
        var sEndDate = aEndDate;
        if (aBgnDate.length == 19) {
            sBgnDate += ',000';
        }
        if (aEndDate.length == 19) {
            sEndDate += ',999';
        }
        gRawDataBaseTime = parseTime(sBgnDate.substring(0, 19) + ',000');

        gTempData = [];
        gTempData.columns = ['date'];
        gTempData.types = ['DATETIME'];

        var sAjaxProcess = [];
        for (var i = 0; i < gTagSets.length; i++) {
            var sTag = gTagSets[i].tag_names;
            var sTable = gTagSets[i].table;
            var sCol = gTagSets[i].calculation_mode.toLowerCase();
            var sDirection = 0; // 0=not use, (1=desc,2=asc)
            //var sUrl = '/machiot-rest-api/datapoints/raw/' + sTag + '/' + sBgnDate + '/' + sEndDate + '/' + sDirection + '/' + sLimit;
            //sUrl += setServerInfoParams(gServerInfo);
            //sAjaxProcess.push(callRawDataAjax(sUrl));
            var sUrl = '/machiot-rest-api/datapoints/raw';
            var sTemp1 = { TagNames: sTag, Start: sBgnDate, End: sEndDate, Direction: sDirection, Count: sLimit, table: sTable };
            var sTemp2 = setServerInfoParams(gServerInfo);
            var sData = $.extend({}, sTemp1, sTemp2);
            sAjaxProcess.push(callRawDataAjax(sUrl, sData));
        }

        $(gMainDiv + ' .wrap-loading').height(
            $(gMainDiv + ' ._maindiv').outerHeight(true) + ($(gMainDiv + ' ._detaildiv').css('display') == 'none' ? 0 : $(gMainDiv + ' ._detaildiv').outerHeight(true))
        );
        $(gMainDiv + ' .wrap-loading').css('display', 'block');
        $(gMainDiv + ' ._title_sm_btn').css('display', 'block');
        $(gMainDiv + ' ._vport_move_btn').addClass('vport-btn-normal-disable');

        $.when.apply(this, sAjaxProcess).always(function () {
            generateData(sBgnDate, sEndDate, gTempData, 2, sLimit); // generate gSeriesData (set gIsDrilledChart = 2) // 0: rollup chart, 1: drill down chart, 2: raw data chart
            if (gSeriesData.length > 0) {
                chartProcess(true); // true = aSkipVport
                storeZoomInfomation();
            } else {
                chartProcess(true); // true = aSkipVport
            }

            $(gMainDiv + ' .wrap-loading').css('display', 'none');
        });
    }

    function callRawDataAjax(aUrl, aData) {
        var sUrl = aUrl;
        //console.log('generateRawDataChart', sUrl);

        return $.ajax({
            url: sUrl,
            type: 'GET',
            dataType: 'json',
            timeout: gTimeOut,
            data: aData,
            error: function (request, status, error) {
                ajaxErrorProcess(request, status, error, gTimeOut, sUrl);
            },
            success: function (d) {
                if (d.error_code != 0) {
                    alert(d.ErrorMessage);
                } else {
                    for (var i = 0; i < d.Data.length; i++) {
                        var sDatas = d.Data[i].Samples;
                        var sDType = d.Data[i].DataType;
                        var sError = d.Data[i].error_code;
                        var sTagNm = d.Data[i].TagName;
                        var sTable = d.Data[i].hasOwnProperty('Table') ? d.Data[i].Table : 'TAG';
                        var sCMode = '';
                        if (d.Data[i].hasOwnProperty('CalculationMode')) {
                            sCMode = d.Data[i].CalculationMode;
                        }

                        if (sError != 0) {
                            console.log(
                                'Error information : ' +
                                    sTagNm +
                                    ', Error Code = ' +
                                    sError +
                                    (d.Data[i].hasOwnProperty('ErrorMessage') ? ', Error Msg = ' + d.Data[i].ErrorMessage : '')
                            );
                            continue;
                        }

                        var sRes = sDatas.map(function (d) {
                            return { key: sTagNm, table: sTable, mode: sCMode, date: d.TimeStamp, value: d.Value, count: d.Quality };
                        });

                        gTempData.columns.push(sTagNm);
                        gTempData.types.push(sDType);
                        gTempData.push(sRes);
                    }
                }
            },
        });
    }

    function generateDrillDownChart(aBgnDate, aEndDate, aInterval) {
        var sInterval = $.extend(true, {}, aInterval);
        var sBgnDate = aBgnDate.substring(0, 19);
        var sEndDate = aEndDate.substring(0, 19);

        gRawDataBaseTime = parseTime(sBgnDate + ',000');

        gTempData = [];
        gTempData.columns = ['date'];
        gTempData.types = ['DATETIME'];
        gTempData.interval = $.extend(true, {}, sInterval);

        var sAjaxProcess = [];
        for (var i = 0; i < gTagSets.length; i++) {
            var sTag = gTagSets[i].tag_names;
            var sTable = gTagSets[i].table;
            var sCol = gTagSets[i].calculation_mode.toLowerCase();
            //var sUrl = '/machiot-rest-api/datapoints/calculated/' + sTag + '/' + sBgnDate + '/' + sEndDate + '/' + sCol + '/' + gLimit + '/' + sInterval.type + '/' + sInterval.value;
            //sUrl += setServerInfoParams(gServerInfo);
            //sAjaxProcess.push(callDrillDownAjax(sUrl));
            var sUrl = '/machiot-rest-api/datapoints/calculated';
            var sTemp1 = {
                TagNames: sTag,
                Start: sBgnDate,
                End: sEndDate,
                CalculationMode: sCol,
                Count: gLimit,
                IntervalType: sInterval.type,
                IntervalValue: sInterval.value,
                table: sTable,
            };
            if (gParams.hasOwnProperty('sec_rollup') && gParams.sec_rollup.hasOwnProperty(sTable)) {
                sTemp1['sec_rollup_exist'] = gParams.sec_rollup[sTable];
            }
            var sTemp2 = setServerInfoParams(gServerInfo);
            var sData = $.extend({}, sTemp1, sTemp2);
            sAjaxProcess.push(callDrillDownAjax(sUrl, sData));
        }

        $(gMainDiv + ' .wrap-loading').height(
            $(gMainDiv + ' ._maindiv').outerHeight(true) + ($(gMainDiv + ' ._detaildiv').css('display') == 'none' ? 0 : $(gMainDiv + ' ._detaildiv').outerHeight(true))
        );
        $(gMainDiv + ' .wrap-loading').css('display', 'block');
        $(gMainDiv + ' ._title_sm_btn').css('display', 'none');
        $(gMainDiv + ' ._vport_move_btn').removeClass('vport-btn-normal-disable');

        $.when.apply(this, sAjaxProcess).always(function () {
            generateData(sBgnDate, sEndDate, gTempData, 1); // generate gSeriesData (set gIsDrilledChart = 2) // 0: rollup chart, 1: drill down chart, 2: raw data chart

            if (gSeriesData.length > 0) {
                chartProcess(true); // true = aSkipVport
                storeZoomInfomation();
            } else {
                chartProcess(true); // true = aSkipVport
            }

            $(gMainDiv + ' .wrap-loading').css('display', 'none');
        });
    }

    function callDrillDownAjax(aUrl, aData) {
        var sUrl = aUrl;
        //console.log('generateDrillDownChart', sUrl);

        return $.ajax({
            url: sUrl,
            type: 'GET',
            dataType: 'json',
            timeout: gTimeOut,
            data: aData,
            error: function (request, status, error) {
                ajaxErrorProcess(request, status, error, gTimeOut, sUrl);
            },
            success: function (d) {
                if (d.error_code != 0) {
                    alert(d.ErrorMessage);
                } else {
                    for (var i = 0; i < d.Data.length; i++) {
                        var sDatas = d.Data[i].Samples;
                        var sDType = d.Data[i].DataType;
                        var sError = d.Data[i].error_code;
                        var sTagNm = d.Data[i].TagName;
                        var sTable = d.Data[i].hasOwnProperty('Table') ? d.Data[i].Table : 'TAG';
                        var sCMode = '';
                        if (d.Data[i].hasOwnProperty('CalculationMode')) {
                            sCMode = d.Data[i].CalculationMode;
                        }

                        if (sError != 0) {
                            console.log(
                                'Error information : ' +
                                    sTagNm +
                                    ', Error Code = ' +
                                    sError +
                                    (d.Data[i].hasOwnProperty('ErrorMessage') ? ', Error Msg = ' + d.Data[i].ErrorMessage : '')
                            );
                            continue;
                        }

                        var sRes = sDatas.map(function (d) {
                            return { key: sTagNm, table: sTable, mode: sCMode, date: d.TimeStamp, value: d.Value, count: d.Quality };
                        });

                        gTempData.columns.push(sTagNm);
                        gTempData.types.push(sDType);
                        gTempData.push(sRes);
                    }
                }
            },
        });
    }

    function brushed() {
        //if (d3.event !== null && d3.event.sourceEvent !== null)  // mouse movement event
        //{
        //    gSkipDataWork = false;
        //}
        if (d3.event.selection == null || d3.event.selection[0] < 0 || d3.event.selection[1] < 0) {
            // just mouse click
            return;
        }

        if (gSkipDataWork) {
            return;
        }
        if (gResizingWindow) {
            return;
        }

        var sBgnDate = gXVport.domain()[0];
        var sEndDate = gXVport.domain()[1];
        if (d3.event.selection !== null) {
            sBgnDate = parseTime(formatTime(gXVport.invert(d3.event.selection[0])));
            var sEndTime = gXVport.invert(d3.event.selection[1]);
            sEndDate = parseTime(formatTime(sEndTime));

            if (gTags == '') {
                if (sEndTime.getHours() > 12) {
                    sEndDate.setDate(sEndDate.getDate() + 1);
                }
            } else {
                if (gUnit == 'min') {
                    if (sEndTime.getSeconds() > 30) {
                        sEndDate.setMinutes(sEndDate.getMinutes() + 1);
                    }
                } else if (gUnit == 'hour') {
                    if (sEndTime.getMinutes() > 30) {
                        sEndDate.setHours(sEndDate.getHours() + 1);
                    }
                } else if (gUnit == 'day') {
                    if (sEndTime.getHours() > 12) {
                        sEndDate.setDate(sEndDate.getDate() + 1);
                    }
                }
            }

            if (gWheeled == 0) {
                // 0: not in wheel event, 1: zoom in wheel, 2: zoom out wheel
                execBrushed(sBgnDate, sEndDate); // generate period gSeriesData
            }
        } else {
            if (gWheeled == 0) {
                // 0: not in wheel event, 1: zoom in wheel, 2: zoom out wheel
                gIsDrilledChart = 0;
                execBrushed(null, null); // generate all gSeriesData
            }
        }
    }

    function execBrushed(aBgnDate, aEndDate) {
        var sBgnDate = aBgnDate;
        var sEndDate = aEndDate;

        if (aBgnDate === null) {
            sBgnDate = gXVport.domain()[0];
        }
        if (aEndDate === null) {
            sEndDate = gXVport.domain()[1];
        }
        generateData(sBgnDate, sEndDate, gData, null, null, true); // generate period gSeriesData  null, null = gIsDrilledChart, Limit
        chartProcess(true);
    }

    function setSelectionColor() {
        if (gGVport == null) {
            return;
        }
        if (gIsDrilledChart == 2) {
            // Raw data chart
            gGVport
                .selectAll('.viewarea')
                .style('fill', '#bff')
                .style('fill-opacity', '0.4')
                .selectAll('.selection')
                .attr('fill', '#44a')
                .attr('fill-opacity', '0.4')
                .style('stroke', '#9ff');
        } else {
            gGVport.selectAll('.viewarea').style('fill', '').style('fill-opacity', '').selectAll('.selection').attr('fill', '#777').attr('fill-opacity', '0.3').style('stroke', '');
        }
    }

    function selectionDblClick() {
        if (gBrushClick) {
            d3.event.stopImmediatePropagation(); // prevent Brush event
            d3.event.preventDefault(); // prevent text selection

            var sX = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x'));
            var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
            var sBgnTime = gXVport.invert(sX);
            var sEndTime = gXVport.invert(sX + sWidth);
            if (formatTime(sBgnTime).substring(0, 19) == formatTime(sEndTime).substring(0, 19)) {
                sEndTime.setTime(sBgnTime.getTime() + 1000);
            }
            var sBgnDate = formatTime(sBgnTime).substring(0, 19);
            var sEndDate = formatTime(sEndTime).substring(0, 19);

            gBgnParam = sBgnDate;
            gEndParam = sEndDate;

            calcQueryTime(function () {
                if (gUnit == '') {
                    gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
                }
                //generateRollupDataChart(true);
                var sNewWidth = gVportInnerWidth * 0.2; // 40% + 20 % + 40%
                var sNewX1 = gVportInnerWidth * 0.4; // 40% + 20 % + 40%
                var sNewX2 = sNewX1 + sNewWidth;
                generateRollupDataChart(false, { begin: sNewX1, end: sNewX2 });
            });
        } else {
            setTimeout(function () {
                gBrushClick = false;
            }, 500);
        }
        gBrushClick = !gBrushClick;
    }

    function storeZoomInfomation() {
        if (d3.select(gMainDiv).select('._viewport').style('display') == 'none') {
            if (gX != null) {
                var sBgnDate = $(gMainDiv + ' ._chartdiv').data('bgn_date');
                var sEndDate = $(gMainDiv + ' ._chartdiv').data('end_date');

                if (gCrntZoomData.range_begin != '') {
                    gLastZoomData = gCrntZoomData;
                }
                gCrntZoomData = { range_begin: sBgnDate, range_end: sEndDate, vport_begin: -1, vport_end: -1 };
            }
        } else {
            if (gXVport != null) {
                var sBgnDate = $(gMainDiv + ' ._chartdiv').data('bgn_date');
                var sEndDate = $(gMainDiv + ' ._chartdiv').data('end_date');
                var sX = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x'));
                var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));

                if (gCrntZoomData.range_begin != '') {
                    gLastZoomData = gCrntZoomData;
                }
                gCrntZoomData = { range_begin: sBgnDate, range_end: sEndDate, vport_begin: sX, vport_end: sX + sWidth };
            }
        }
    }

    function mouseRightClick() {
        if (d3.event != null) {
            d3.event.preventDefault();
        }
        if (gLastZoomData.range_begin == '' && gLastZoomData.range_end == '') {
            return;
        }

        if (gLastZoomData.range_begin != gCrntZoomData.range_begin || gLastZoomData.range_end != gCrntZoomData.range_end) {
            gBgnParam = gLastZoomData.range_begin;
            gEndParam = gLastZoomData.range_end;

            calcQueryTime(function () {
                if (gUnit == '') {
                    gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
                }

                generateRollupDataChart(false, { begin: gLastZoomData.vport_begin, end: gLastZoomData.vport_end });
            });
        } else if (gLastZoomData.vport_begin < 0 && gLastZoomData.vport_end < 0) {
            gIsDrilledChart = 0;
            execBrushed(null, null); // generate all gSeriesData
            $(gMainDiv + ' ._viewport').css('display', 'none');
            handleMouseOver();
            storeZoomInfomation();
        } else {
            $(gMainDiv + ' ._viewport').css('display', 'block');
            gGVport.select('.viewarea').call(gViewport.move, [gLastZoomData.vport_begin, gLastZoomData.vport_end]);
            handleMouseOver();
        }
    }

    // aDateBgn must be different from aDateEnd.
    function moveRawDataChart(aDateBgn, aDateEnd) {
        var sDateBgn = formatTime(aDateBgn);
        var sDateEnd = formatTime(aDateEnd);
        //var sX = parseInt( d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x') );
        var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
        if (sWidth < 1) {
            sWidth = 1;
        }
        var sVPortWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.overlay').attr('width'));
        var sBgnX = gXVport(aDateBgn);
        var sBgn = sBgnX;
        if (sBgn < 0) {
            sBgn = 0;
        }
        if (sBgn > sVPortWidth) {
            sBgn = sVPortWidth - sWidth;
        }
        var sEnd = sBgnX + sWidth;
        if (sEnd > sVPortWidth) {
            sEnd = sVPortWidth;
        }
        generateRawDataChart(sDateBgn, sDateEnd, 0);

        gSkipDataWork = true; // Skip generate data on vport move event.
        gGVport.select('.viewarea').call(gViewport.move, [sBgn, sEnd]);
    }

    function adjustViewport(aEvent) {
        var sLeft = aEvent.data.left;
        var sRight = aEvent.data.right;
        var sX = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x'));
        var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
        if (gIsDrilledChart == 2) {
            // extend +-1000% when raw data chart
            sLeft *= 200;
            sRight *= 200;
        }
        var sAdjustX1 = sWidth * sLeft;
        var sAdjustX2 = sWidth * sRight;
        var sNewX1 = sX;
        var sNewX2 = sX + sWidth;

        if (sLeft >= 0) {
            sAdjustX1 = Math.ceil(sAdjustX1);
        } else {
            sAdjustX1 = Math.floor(sAdjustX1);
        }
        if (sRight >= 0) {
            sAdjustX2 = Math.ceil(sAdjustX2);
        } else {
            sAdjustX2 = Math.floor(sAdjustX2);
        }

        sNewX1 += sAdjustX1;
        sNewX2 += sAdjustX2;

        if (sLeft == sRight) {
            // move case
            if (sNewX1 < 0) {
                sNewX1 = 0;
                sNewX2 = sNewX1 + sWidth;
            }
            if (sNewX2 > gVportInnerWidth) {
                sNewX2 = gVportInnerWidth;
                sNewX1 = sNewX2 - sWidth;
            }
        }
        if (sNewX1 < 0) {
            sNewX1 = 0;
        }
        if (sNewX2 > gVportInnerWidth) {
            sNewX2 = gVportInnerWidth;
        }

        if (sNewX1 >= sNewX2) {
            if (sRight == 0) {
                sNewX1 = sNewX2 - 1;
            } else {
                sNewX2 = sNewX1 + 1;
            }
        }

        gGVport.select('.viewarea').call(gViewport.move, [sNewX1, sNewX2]);
    }

    function adjustViewportRange(aEvent) {
        var sType = aEvent.data.type;
        var sZoom = aEvent.data.zoom / 2; // left & right

        var sBgn = gXVport.invert(0);
        var sEnd = gXVport.invert(gVportInnerWidth);
        var sTimeGap = sEnd.getTime() - sBgn.getTime();
        var sNewTimeBgn = null;
        var sNewTimeEnd = null;

        if (sType == 'I') {
            sZoom = sZoom * -1.0;
        }

        // calc new time range
        sNewTimeBgn = sBgn.getTime() - sTimeGap * sZoom;
        sNewTimeEnd = sEnd.getTime() + sTimeGap * sZoom;
        if (sNewTimeBgn >= sNewTimeEnd) {
            alert('The time range is too small to perform this function.');
            return;
        }
        // set gBgnParam & gEndParam -> call calcQueryTime()
        gBgnParam = formatTime(sNewTimeBgn).substring(0, 19);
        gEndParam = formatTime(sNewTimeEnd).substring(0, 19);

        calcQueryTime(function () {
            if (gUnit == '') {
                gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
            }

            var sParsedBgn = d3.timeParse('%Y-%m-%d %H:%M:%S')(gBgn);
            var sParsedEnd = d3.timeParse('%Y-%m-%d %H:%M:%S')(gEnd);

            var sX = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x'));
            var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
            if (sWidth < 5) {
                sWidth = 5;
            }
            var sBgnTime = gXVport.invert(sX);
            var sEndTime = gXVport.invert(sX + sWidth);
            //if (formatTime( sBgnTime ).substring(0,19) == formatTime( sEndTime ).substring(0,19))
            if (sEndTime - sBgnTime < 1000) {
                sEndTime.setTime(sBgnTime.getTime() + 1000);
            }
            var sNewRange = sParsedEnd.getTime() + 999 - sParsedBgn.getTime(); // add 999 millisecond to sParsedEnd
            var sNewWidth = ((sEndTime.getTime() - sBgnTime.getTime()) / sNewRange) * (gVportInnerWidth + 1); // Vport start with 0. +1
            var sNewX1 = ((sBgnTime.getTime() - sParsedBgn.getTime()) / sNewRange) * (gVportInnerWidth + 1); // Vport start with 0. +1
            var sNewX2 = sNewX1 + sNewWidth;
            if (sNewWidth > gVportInnerWidth) {
                sNewWidth = gVportInnerWidth;
            }
            if (sNewX1 < 0) {
                sNewX1 = 0;
                sNewX2 = sNewX1 + sNewWidth;
            } else if (sNewX2 > gVportInnerWidth) {
                sNewX2 = gVportInnerWidth;
                sNewX1 = sNewX2 - sNewWidth;
            }

            generateRollupDataChart(false, { begin: sNewX1, end: sNewX2 });
        });
    }

    function resetViewport(aEvent) {
        var sType = aEvent.data.event;
        var sX = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x'));
        var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
        var sBgnTime = gXVport.invert(sX);
        var sEndTime = gXVport.invert(sX + sWidth);
        var sBgnDate = formatTime(sBgnTime).substring(0, 19);
        var sEndDate = formatTime(sEndTime).substring(0, 19);

        switch (sType) {
            case 'reset':
                gBgnParam = '';
                gEndParam = '';
                if (gParams.range_bgn != '') {
                    // range defined in chart setting
                    gBgnParam = gParams.range_bgn;
                }
                if (gParams.range_end != '') {
                    // range defined in chart setting
                    gEndParam = gParams.range_end;
                }

                if (gBgnParam == '' && gEndParam == '' && $('#_boards').length > 0) {
                    // range not defined in chart setting & _boards div exist
                    gBgnParam = $('#_boards').data('start'); // get Dashboard time range
                    gEndParam = $('#_boards').data('end');
                }

                calcQueryTime(function () {
                    if (gUnit == '') {
                        gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
                    }
                    var sNewWidth = gVportInnerWidth * 0.2; // 40% + 20 % + 40%
                    var sNewX1 = gVportInnerWidth * 0.4; // 40% + 20 % + 40%
                    var sNewX2 = sNewX1 + sNewWidth;

                    generateRollupDataChart(false, { begin: sNewX1, end: sNewX2 });
                }); // convert now & get min/max time when (gBgnParam == '' && gEndParam == '')

                /*
            var sParsedBgn = d3.timeParse('%Y-%m-%d %H:%M:%S')(gBgn);
            var sParsedEnd = d3.timeParse('%Y-%m-%d %H:%M:%S')(gEnd);
            var sNewRange = sParsedEnd.getTime() + 999 - sParsedBgn.getTime(); // add 999 millisecond to sParsedEnd
            var sNewX1 = ( sBgnTime.getTime() - sParsedBgn.getTime() ) / sNewRange * (gVportInnerWidth + 1);  // Vport start with 0. +1
            //var sNewX2 = ( sEndTime.getTime() - sParsedBgn.getTime() ) / sNewRange * (gVportInnerWidth + 1);
            var sNewWidth = ( sEndTime.getTime() - sBgnTime.getTime() ) / sNewRange * (gVportInnerWidth + 1);  // Vport start with 0. +1

            generateRollupDataChart(false, {'begin':sNewX1, 'end':(sNewX1+sNewWidth)});
*/
                break;
            case 'center':
                var sNewX1 = (gVportInnerWidth - sWidth) / 2; // 2: adjust
                var sNewX2 = sNewX1 + sWidth;
                var sAdjust = sNewX1 - sX;
                var sBgnTime = gXVport.invert(0 - sAdjust + 1);
                var sEndTime = gXVport.invert(gVportInnerWidth - sAdjust + 1);
                if (formatTime(sBgnTime).substring(0, 19) == formatTime(sEndTime).substring(0, 19)) {
                    //sEndTime = sBgnTime + 1000;
                    alert('The time range is too small to perform this function.');
                    break;
                }

                gBgnParam = formatTime(sBgnTime).substring(0, 19);
                gEndParam = formatTime(sEndTime).substring(0, 19);

                calcQueryTime(function () {
                    if (gUnit == '') {
                        gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
                    }

                    var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
                    var sNewX1 = (gVportInnerWidth - sWidth) / 2; // 2: adjust
                    var sNewX2 = sNewX1 + sWidth;
                    generateRollupDataChart(false, { begin: sNewX1, end: sNewX2 });
                });

                break;
            case 'resize':
                // var sNewWidth = gVportInnerWidth * 0.2;  // 40% + 20 % + 40%
                // var sNewX1 = gVportInnerWidth * 0.4;  // 40% + 20 % + 40%
                // var sNewX2 = sNewX1 + sNewWidth;
                // var sTimeGap = sEndTime.getTime() - sBgnTime.getTime();
                // var sNewTimeBgn = sBgnTime.getTime() - (sTimeGap * 2);
                // var sNewTimeEnd = sEndTime.getTime() + (sTimeGap * 2);
                var sNewTimeBgn = sBgnTime.getTime();
                var sNewTimeEnd = sEndTime.getTime();

                if (formatTime(sNewTimeBgn).substring(0, 19) == formatTime(sNewTimeEnd).substring(0, 19)) {
                    //sNewTimeEnd = sNewTimeBgn + 1000;
                    alert('The time range is too small to perform this function.');
                    break;
                }

                gBgnParam = formatTime(sNewTimeBgn).substring(0, 19);
                gEndParam = formatTime(sNewTimeEnd).substring(0, 19);

                calcQueryTime(function () {
                    if (gUnit == '') {
                        gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
                    }

                    var sNewWidth = gVportInnerWidth * 0.2; // 40% + 20 % + 40%
                    var sNewX1 = gVportInnerWidth * 0.4; // 40% + 20 % + 40%
                    var sNewX2 = sNewX1 + sNewWidth;
                    generateRollupDataChart(false, { begin: sNewX1, end: sNewX2 });
                });

                break;
        }
    }

    function callVportRangeModal(aEvent) {
        var sType = aEvent.data.event; // begin | end
        var sBgn = $(gMainDiv + ' ._chartdiv')
            .data('bgn_date')
            .substring(0, 19);
        var sEnd = $(gMainDiv + ' ._chartdiv')
            .data('end_date')
            .substring(0, 19);

        makeVportRangeModal();

        if (sType == 'begin') {
            $('#_vport_end_cal').css('background', $('#_vport_end').css('background-color'));
            $('#_vport_end_cal').css('border', '1px solid ' + $('#_vport_end').css('border-bottom-color'));
            $('#_vport_end_cal').css('color', '#777');
            $('#_vport_end_cal').css('cursor', 'not-allowed');
            $('#_vport_end').css('color', '#777');
            $('#_vport_end').prop('disabled', true);
        } else {
            $('#_vport_bgn_cal').css('background', $('#_vport_bgn').css('background-color'));
            $('#_vport_bgn_cal').css('border', '1px solid ' + $('#_vport_bgn').css('border-bottom-color'));
            $('#_vport_bgn_cal').css('color', '#777');
            $('#_vport_bgn_cal').css('cursor', 'not-allowed');
            $('#_vport_bgn').css('color', '#777');
            $('#_vport_bgn').prop('disabled', true);
        }
        $('#_vport_range_type').val(sType);
        $('#_vport_bgn').val(sBgn);
        $('#_vport_end').val(sEnd);
        $('#vportRangeModal').modal('show');

        // event define
        $('._vport_range_input')
            .unbind('focus')
            .focus(function () {
                $(this).data('old_value', $(this).val());
            });

        $('._vport_range_input')
            .unbind('blur')
            .blur(function () {
                var sValue = $(this).val().trim().toLowerCase();
                if ($(this).data().hasOwnProperty('DateTimePicker')) {
                    $(this).data('DateTimePicker').destroy();
                } else {
                    if (sValue === '' || $(this).val() == $(this).data('old_value')) {
                        return;
                    }
                    if (!moment(sValue, 'YYYY-MM-DD HH:mm:ss').isValid()) {
                        alert('Invalid input.');
                        $(this).val($(this).data('old_value'));
                        $(this).focus();
                        return;
                    }
                }

                if ($('#_vport_duration').val() != '') {
                    $('#_vport_duration').trigger('blur');
                }
            });

        $('#_vport_duration')
            .unbind('blur')
            .blur(function () {
                var sType = $('#_vport_range_type').val();
                var sValue = $(this).val();
                var sUnit = sValue.slice(-1);
                var sVals = parseInt(sValue.slice(0, -1).trim());
                var sBase = '';
                var sTimeStamp = 0;
                var sCalcTime = null;

                if (sValue == '') {
                    return;
                }
                if (sUnit != 'y' && sUnit != 'M' && sUnit != 'd' && sUnit != 'h' && sUnit != 'm' && sUnit != 's') {
                    alert('Invalid input.');
                    $(this).focus();
                    return;
                }
                if (isNaN(sVals)) {
                    alert('Invalid input.');
                    $(this).focus();
                    return;
                }

                if (sType == 'begin') {
                    sBase = $('#_vport_bgn').val();
                    if (sBase == '') {
                        sBase = calcTimeNow('now', true);
                    }
                } else {
                    sBase = $('#_vport_end').val();
                    if (sBase == '') {
                        sBase = calcTimeNow('now', false);
                    }
                }

                sCalcTime = d3.timeParse('%Y-%m-%d %H:%M:%S')(sBase);
                if (sUnit == 'y') {
                    if (sType == 'begin') {
                        sCalcTime.setYear(sCalcTime.getFullYear() + sVals);
                        $('#_vport_end').val(formatTime(sCalcTime).substring(0, 19));
                    } else {
                        sCalcTime.setYear(sCalcTime.getFullYear() - sVals);
                        $('#_vport_bgn').val(formatTime(sCalcTime).substring(0, 19));
                    }
                } else if (sUnit == 'M') {
                    if (sType == 'begin') {
                        sCalcTime.setMonth(sCalcTime.getMonth() + sVals);
                        $('#_vport_end').val(formatTime(sCalcTime).substring(0, 19));
                    } else {
                        sCalcTime.setMonth(sCalcTime.getMonth() - sVals);
                        $('#_vport_bgn').val(formatTime(sCalcTime).substring(0, 19));
                    }
                } else {
                    sTimeStamp = sVals;
                    switch (sUnit) {
                        case 's':
                            sTimeStamp *= 1000;
                            break;
                        case 'm':
                            sTimeStamp *= 60 * 1000;
                            break;
                        case 'h':
                            sTimeStamp *= 60 * 60 * 1000;
                            break;
                        case 'd':
                            sTimeStamp *= 24 * 60 * 60 * 1000;
                            break;
                    }

                    if (sType == 'begin') {
                        sCalcTime.setTime(sCalcTime.getTime() + sTimeStamp);
                        $('#_vport_end').val(formatTime(sCalcTime).substring(0, 19));
                    } else {
                        sCalcTime.setTime(sCalcTime.getTime() - sTimeStamp);
                        $('#_vport_bgn').val(formatTime(sCalcTime).substring(0, 19));
                    }
                }
            });

        $('._vport_calendar').click(function () {
            var sType = $('#_vport_range_type').val();
            var sInput = $(this).data('input');
            var sSideBySide = true;

            if ((sType == 'begin' && sInput == '_vport_end') || (sType == 'end' && sInput == '_vport_bgn')) {
                return;
            }

            if (window.innerWidth < 900) {
                sSideBySide = false;
            }

            var sValue = $('#' + sInput)
                .val()
                .trim();
            if (sValue != '') {
                var sTimeStamp = Date.parse(sValue);
                if (isNaN(sTimeStamp)) {
                    $('#' + sInput).val('');
                }
            }

            $('#' + sInput).datetimepicker({ format: 'YYYY-MM-DD HH:mm:ss', sideBySide: sSideBySide, showClose: true, toolbarPlacement: 'top' }); // ,showTodayButton:true,showClear:true
            $('#' + sInput)
                .unbind('dp.show')
                .bind('dp.show', function (e) {
                    $('.bootstrap-datetimepicker-widget').css('background-color', $('body').css('background-color'));
                    $('.bootstrap-datetimepicker-widget').css('color', $('body').css('color'));
                });
            $('#' + sInput)
                .data('DateTimePicker')
                .show();
        });

        $('.durationsimple')
            .unbind('click')
            .click(function () {
                var sValue = $(this).data('duration');
                $('#_vport_duration').val(sValue);

                $('#_vport_duration').trigger('blur');
            });

        $('#_vport_btn_ok')
            .unbind('click')
            .click(function () {
                var sBgn = $('#_vport_bgn').val();
                var sEnd = $('#_vport_end').val();
                if (sBgn == sEnd) {
                    alert('From date and To date should be different.');
                    return;
                }

                gBgnParam = sBgn;
                gEndParam = sEnd;

                calcQueryTime(function () {
                    if (gUnit == '') {
                        gInterval = calcInterval(gBgn, gEnd, gInnerWidth);
                    }

                    var sParsedBgn = d3.timeParse('%Y-%m-%d %H:%M:%S')(gBgn);
                    var sParsedEnd = d3.timeParse('%Y-%m-%d %H:%M:%S')(gEnd);

                    var sX = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('x'));
                    var sWidth = parseInt(d3.select(gMainDiv).select('.viewarea').select('.selection').attr('width'));
                    var sBgnTime = gXVport.invert(sX);
                    var sEndTime = gXVport.invert(sX + sWidth);
                    if (formatTime(sBgnTime).substring(0, 19) == formatTime(sEndTime).substring(0, 19)) {
                        sEndTime.setTime(sBgnTime.getTime() + 1000);
                    }
                    var sNewRange = sParsedEnd.getTime() + 999 - sParsedBgn.getTime(); // add 999 millisecond to sParsedEnd
                    var sNewWidth = ((sEndTime.getTime() - sBgnTime.getTime()) / sNewRange) * (gVportInnerWidth + 1); // Vport start with 0. +1
                    var sNewX1 = ((sBgnTime.getTime() - sParsedBgn.getTime()) / sNewRange) * (gVportInnerWidth + 1); // Vport start with 0. +1
                    var sNewX2 = sNewX1 + sNewWidth;
                    if (sNewWidth > gVportInnerWidth) {
                        sNewWidth = gVportInnerWidth;
                    }
                    if (sNewX1 < 0) {
                        sNewX1 = 0;
                        sNewX2 = sNewX1 + sNewWidth;
                    } else if (sNewX2 > gVportInnerWidth) {
                        sNewX2 = gVportInnerWidth;
                        sNewX1 = sNewX2 - sNewWidth;
                    }

                    generateRollupDataChart(false, { begin: sNewX1, end: sNewX2 });
                    $('#vportRangeModal').modal('hide');
                });
            });

        $('#vportRangeModal')
            .unbind('hidden.bs.modal')
            .bind('hidden.bs.modal', function (e) {
                $(this).remove();
            });
    }

    function makeVportRangeModal() {
        var sHtml =
            '\
<div class="modal fade" id="vportRangeModal" tabindex="-1" role="dialog" aria-labelledby="" aria-hidden="true">\
  <div class="modal-dialog">\
      <div class="modal-header">\
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true"><img src="/static/img/iot/i_b_close.png" alt="" /></button>\
        <h4 class="modal-title">Time range</h4>\
      </div>\
      <form class="form-horizontal" method="">\
        <input type="hidden" id="_vport_range_type" name="_vport_range_type" value="begin">\
        <div class="modal-body">\
          <div class="row">\
            <div class="col-sm-6 col-left">\
              <label class="control-label" for="_vport_bgn">From</label>\
              <div class="input-group">\
                <span class="input-group-addon _vport_calendar" data-input="_vport_bgn" id="_vport_bgn_cal"><span class="glyphicon glyphicon-calendar" aria-hidden="true"></span></span>\
                <input type="text" class="form-control _vport_range_input" name="_vport_bgn" id="_vport_bgn" data-old_value="">\
              </div>\
              <label class="control-label" for="_vport_end">To</label>\
              <div class="input-group">\
                <span class="input-group-addon _vport_calendar" data-input="_vport_end" id="_vport_end_cal"><span class="glyphicon glyphicon-calendar" aria-hidden="true"></span></span>\
                <input type="text" class="form-control _vport_range_input" name="_vport_end" id="_vport_end" data-old_value="">\
              </div>\
              <label class="control-label" for="_vport_duration">Duration</label>\
              <input type="text" class="form-control _vport_duration_input" name="_vport_duration" id="_vport_duration">\
            </div>\
            <div class="col-sm-6 col-right">\
              <label class="control-label">Quick duration</label>\
              <table style="width:100%;">\
                <tbody>\
                  <tr>\
                    <td style="width:50%;"><a class="durationsimple" data-duration="1y">1 year</a></td>\
                    <td style="width:50%;"><a class="durationsimple" data-duration="3h">3 hours</a></td>\
                  </tr>\
                  <tr>\
                    <td><a class="durationsimple" data-duration="6M">6 months</a></td>\
                    <td><a class="durationsimple" data-duration="1h">1 hours</a></td>\
                  </tr>\
                  <tr>\
                    <td><a class="durationsimple" data-duration="1M">1 month</a></td>\
                    <td><a class="durationsimple" data-duration="30m">30 minutes</a></td>\
                  </tr>\
                  <tr>\
                    <td><a class="durationsimple" data-duration="1d">1 day</a></td>\
                    <td><a class="durationsimple" data-duration="10m">10 minutes</a></td>\
                  </tr>\
                  <tr>\
                    <td><a class="durationsimple" data-duration="12h">12 hours</a></td>\
                    <td><a class="durationsimple" data-duration="1m">1 minute</a></td>\
                  </tr>\
                  <tr>\
                    <td><a class="durationsimple" data-duration="6h">6 hours</a></td>\
                    <td><a class="durationsimple" data-duration="30s">30 seconds</a></td>\
                  </tr>\
                </tbody>\
              </table>\
              <div class="form-group wrapbuttons">\
                <button type="button" class="btn modal-btn btn-ok" id="_vport_btn_ok" name="_vport_btn_ok">Ok</button><button type="button" class="btn modal-btn btn-cancel" data-dismiss="modal" id="_vport_btn_cancel" name="_vport_btn_cancel">Cancel</button>\
              </div>\
            </div>\
          </div>\
        </div>\
      </form>\
  </div>\
</div>';
        $('body').append(sHtml);
    }

    function makeTagAliasModal() {
        var sHtml =
            '\
        <div class="modal fade" id="aliasModal" tabindex="-1" role="dialog" aria-labelledby="" aria-hidden="true">\
            <div class="modal-dialog" style="width:400px;">\
            <div class="modal-content">\
                <div class="modal-header">\
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true"><img src="/static/img/iot/i_b_close.png" alt="" /></button>\
                <p>Tag Name</p>\
                </div>\
                <form class="form-horizontal" method="">\
                <div class="modal-body">\
                    <div class="row">\
                    <div class="col-sm-4 col-left">\
                        <label class="control-label pull-right">Alias Name</label>\
                    </div>\
                    <div class="col-sm-6 col-center">\
                        <input type="text" class="form-control" name="_alias_input" id="_alias_input" required>\
                    </div>\
                    </div>\
                </div>\
                <div class="modal-footer">\
                    <div class="form-group">\
                    <button type="button" class="btn modal-btn btn-ok" id="_alias_ok" name="_alias_ok">Ok</button><button type="button" class="btn modal-btn btn-cancel" data-dismiss="modal" id="_alias_cancel" name="_alias_cancel">Cancel</button>\
                    </div>\
                </div>\
                </form>\
            </div>\
            </div>\
        </div>';
        $('body').append(sHtml);
    }

    function callTagAliasModal(aName) {
        var sIndex = aName.replace('series_', '');
        makeTagAliasModal();
        $('#_alias_input').val(gAlias[sIndex]);
        $('#aliasModal').modal('show');

        $('#_alias_ok')
            .unbind('click')
            .click(function () {
                gParams.tag_set[sIndex].alias = $('#_alias_input').val();
                gAlias[sIndex] = $('#_alias_input').val();

                $('#aliasModal').modal('hide');
                $(gMainDiv + ' ._refreshchart').trigger('click');
                drawMainChart();
            });

        $('#aliasModal')
            .unbind('hidden.bs.modal')
            .bind('hidden.bs.modal', function (e) {
                $(this).remove();
            });
    }

    //////////////// Viewport function (end) //////////////////////////

    //////////////// Drag(for zoom) function (begin) //////////////////////////
    function dragStart() {
        gDragged = false;

        gSelectedX.start = d3.event.x;
        gG.select('.draged').attr('x', gSelectedX.start);
        gG.select('.draged').attr('width', 0);
        gG.select('.draged').style('display', null);
    }

    function dragMove() {
        gDragged = true;
        gSelectedX.end = d3.event.x;
        if (gSelectedX.end < gSelectedX.start) {
            gG.select('.draged').attr('x', gSelectedX.end);
            gG.select('.draged').attr('width', gSelectedX.start - gSelectedX.end);
        } else {
            gG.select('.draged').attr('x', gSelectedX.start);
            gG.select('.draged').attr('width', gSelectedX.end - gSelectedX.start);
        }
    }

    function dragEnd() {
        if (!gDragged) {
            return;
        }
        gDragged = false;

        if (gSelectedX.end < gSelectedX.start) {
            gSelectedX.end = gSelectedX.start;
            gSelectedX.start = d3.event.x;
        } else if (Math.abs(gSelectedX.end - gSelectedX.start) < 2) {
            executeClick(d3.event.x, d3.event.y);
            return;
        } else {
            gSelectedX.end = d3.event.x;
        }

        gG.select('.draged').style('display', 'none');
        $(gMainDiv + ' ._viewport').css('display', 'block');

        var sBgnDate = null;
        var sEndTime = null;
        var sEndDate = null;
        if (gIsDrilledChart == 2) {
            // 0: rollup chart, 1: drill down chart, 2: raw data chart
            var sBgnX = gX.invert(gSelectedX.start);
            var sEndX = gX.invert(gSelectedX.end);
            var sBgnDateStr = '';
            var sEndDateStr = '';
            var sIdx = 0;
            var sBgnXSlt = 0;
            var sEndXSlt = 0;

            for (var i = 0; i < gSeriesData.length; i++) {
                if (gSeriesData[i].length <= 0) {
                    continue;
                }

                sIdx = bisectDate(gSeriesData[i], sBgnX, 1);
                if (sIdx >= gSeriesData[i].length) {
                    sIdx = gSeriesData[i].length - 1;
                }
                if (Math.abs(gSeriesData[i][sIdx].date - sBgnX) < Math.abs(sBgnXSlt - sBgnX)) {
                    sBgnXSlt = gSeriesData[i][sIdx].date;
                    //sBgnDateStr = gSeriesData[i][sIdx].dateStr.substring(0,19) + ',' + gSeriesData[i][sIdx].dateStr.substring(20,23);
                    var sMilli = gSeriesData[i][sIdx].dateStr.substring(20, 23);
                    if (sMilli == '') {
                        sMilli = '000';
                    }
                    sBgnDateStr = gSeriesData[i][sIdx].dateStr.substring(0, 19) + ',' + sMilli;
                }

                sIdx = bisectDate(gSeriesData[i], sEndX, 1);
                if (sIdx >= gSeriesData[i].length) {
                    sIdx = gSeriesData[i].length - 1;
                }
                if (Math.abs(gSeriesData[i][sIdx].date - sEndX) < Math.abs(sEndXSlt - sEndX)) {
                    sEndXSlt = gSeriesData[i][sIdx].date;
                    //sEndDateStr = gSeriesData[i][sIdx].dateStr.substring(0,19) + ',' + gSeriesData[i][sIdx].dateStr.substring(20,23);
                    var sMilli = gSeriesData[i][sIdx].dateStr.substring(20, 23);
                    if (sMilli == '') {
                        sMilli = '000';
                    }
                    sEndDateStr = gSeriesData[i][sIdx].dateStr.substring(0, 19) + ',' + sMilli;
                }
            }

            sBgnDate = parseTime(formatTime(gRawDataBaseTime.getTime() + Math.floor(sBgnX * 1000)));
            sEndTime = parseTime(formatTime(gRawDataBaseTime.getTime() + Math.floor(sEndX * 1000)));
            sEndDate = sEndTime;
        } else {
            sBgnDate = parseTime(formatTime(gX.invert(gSelectedX.start)));
            sEndTime = gX.invert(gSelectedX.end);
            sEndDate = parseTime(formatTime(sEndTime));
        }

        if (gTags == '') {
            if (sEndTime.getHours() > 12) {
                sEndDate.setDate(sEndDate.getDate() + 1);
            }
        } else {
            if (gUnit == 'min') {
                if (sEndTime.getSeconds() > 30) {
                    sEndDate.setMinutes(sEndDate.getMinutes() + 1);
                }
            } else if (gUnit == 'hour') {
                if (sEndTime.getMinutes() > 30) {
                    sEndDate.setHours(sEndDate.getHours() + 1);
                }
            }
        }

        if (formatTime(sBgnDate) != formatTime(sEndDate)) {
            if (gIsDrilledChart == 2) {
                // 0: rollup chart, 1: drill down chart, 2: raw data chart
                generateData(sBgnDate, sEndDate, gTempData, 2); // generate period gSeriesData... gTempData = previous ajax result (= raw data)
                chartProcess(true);
                handleMouseOver();
            } else {
                execBrushed(sBgnDate, sEndDate);
                gGVport.select('.viewarea').call(gViewport.move, [gXVport(sBgnDate), gXVport(sEndDate)]);
                handleMouseOver();
            }
        }
    }
    //////////////// Drag(for zoom) function (end) //////////////////////////

    //////////////// Legend function (begin) //////////////////////////
    function drawLegend() {
        var sCnt = 0;
        // gNameLegendValue = ['min', 'max', 'sum', 'avg']
        // gShowLegendValue = [true, true, true, true]
        $.each(gShowLegendValue, function (idx, val) {
            if (val) sCnt++;
        });
        //var sWid = Math.floor(68.0 / sCnt);  // 100 - 5 - 27 = 68
        var sWid = 50 + 5 * (4 - sCnt);

        var sHtml = '<table class="legend_table"><thead>';
        sHtml += '<tr style="text-align:center;">';
        //sHtml += '<td style="width:5%"></td><td style="width:' + (100 - (sWid * sCnt) - 5) + '%"><bold> </bold></td>';
        sHtml += '<td style="width:15px"></td><td><bold>&nbsp;</bold></td>';
        for (var i = 0; i < gShowLegendValue.length; i++) {
            if (!gShowLegendValue[i]) {
                continue;
            }

            sHtml += '<td style="width:' + sWid + 'px"><bold>' + gNameLegendValue[i] + '</bold></td>';
        }
        sHtml += '</tr></thead><tbody>';

        var sLegendClass = ['legend_td_odd', 'legend_td_even'];
        //for (var i = 0; i < gSeriesData.length; i++)
        //{
        //    if (gSeriesData[i].length <= 0)
        //    {
        //        continue;
        //    }
        for (var k = 0; k < gSeriesName.length; k++) {
            var sSerieName = 'series_' + k.toString();
            var i = gSeriesData.findIndex(function (sArray) {
                return sArray.length > 0 && sArray[0].name == sSerieName;
            });
            if (i < 0) {
                continue; // Need to change to display tag name only.
            }

            var sTmpMin = d3.min(gSeriesData[i], function (d) {
                return d.value;
            });
            var sTmpMax = d3.max(gSeriesData[i], function (d) {
                return d.value;
            });
            var sTmpSum = d3.sum(gSeriesData[i], function (d) {
                return d.value;
            });
            var sTmpAvg = d3.mean(gSeriesData[i], function (d) {
                return d.value;
            });

            var sFmtMin = ',d';
            var sFmtMax = ',d';
            var sFmtSum = ',d';
            var sFmtAvg = ',.2f';

            if (gData.types[i + 1] == 'FLOAT' || gData.types[i + 1] == 'DOUBLE') {
                sFmtMin = ',.2f';
                sFmtMax = ',.2f';
                sFmtSum = ',.2f';

                if (sTmpMin >= 10000 || sTmpMin <= -10000) {
                    sFmtMin = '.5s';
                }
                if (sTmpMax >= 10000 || sTmpMax <= -10000) {
                    sFmtMax = '.5s';
                }
                if (sTmpSum >= 10000 || sTmpSum <= -10000) {
                    sFmtSum = '.5s';
                }
            } else {
                if (sTmpMin >= 100000 || sTmpMin <= -100000) {
                    sFmtMin = '.3s';
                }
                if (sTmpMax >= 100000 || sTmpMax <= -100000) {
                    sFmtMax = '.3s';
                }
                if (sTmpSum >= 100000 || sTmpSum <= -100000) {
                    sFmtSum = '.3s';
                }
            }
            if (sTmpAvg > 10000 || sTmpAvg < -10000) {
                sFmtAvg = '.3s';
            }

            //            sHtml += '<tr><td style="text-align:left;color:' + gZ(gSeriesData[i][0].name) + ';"><span class="glyphicon glyphicon-minus"></span></td><td data-toggle="tooltip" title="' + gSeriesData[i][0].key + '(' + gSeriesData[i][0].mode + ')' + '" style="text-align:left;"><a onclick="legendClick(\'' + gSeriesData[i][0].name + '\')" style="cursor:pointer;">' + gSeriesData[i][0].key + '(' + gSeriesData[i][0].mode + ')' + '</a></td>';
            sHtml +=
                '<tr>\
                <td style="text-align:left;color:' +
                gZ(gSeriesData[i][0].name) +
                ';">\
                    <span class="glyphicon glyphicon-minus changeAlias"></span>\
                </td>\
                <td data-toggle="tooltip" title="' +
                gSeriesData[i][0].key +
                '(' +
                gSeriesData[i][0].mode +
                ')' +
                '" style="text-align:left;">\
                    <a class="legendclick" data-series="' +
                gSeriesData[i][0].name +
                '" style="cursor:pointer;">' +
                gSeriesData[i][0].key +
                '(' +
                gSeriesData[i][0].mode +
                ')' +
                '</a>\
                </td>';

            sCnt = 0; // = visible legend count
            for (var j = 0; j < gShowLegendValue.length; j++) {
                if (!gShowLegendValue[j]) {
                    continue;
                }

                var sTVal = 0;
                var sTFmt = '';
                if (gNameLegendValue[j] == 'min') {
                    sTVal = sTmpMin;
                    sTFmt = sFmtMin;
                } else if (gNameLegendValue[j] == 'max') {
                    sTVal = sTmpMax;
                    sTFmt = sFmtMax;
                } else if (gNameLegendValue[j] == 'sum') {
                    sTVal = sTmpSum;
                    sTFmt = sFmtSum;
                } else if (gNameLegendValue[j] == 'avg') {
                    sTVal = sTmpAvg;
                    sTFmt = sFmtAvg;
                }

                sHtml += '<td class="' + sLegendClass[sCnt % 2] + '" data-toggle="tooltip" title="' + d3.format(',')(sTVal) + '">' + d3.format(sTFmt)(sTVal) + '</td>';

                sCnt++;
            }

            sHtml += '</tr>';
        }
        sHtml += '</tbody></table>';
        //        d3.select('body').select(gMainDiv).select('._legenddiv').html(sHtml);
        d3.select(gMainDiv).select('._legenddiv').html(sHtml);

        $(gMainDiv + ' .legendclick')
            .unbind('click')
            .click(function () {
                var sName = $(this).data('series');
                legendClick(sName);
            });

        $(gMainDiv + ' .changeAlias')
            .unbind('cilck')
            .click(function () {
                var sName = $(this).parent().siblings().children('.legendclick').data('series');
                callTagAliasModal(sName);
            });
    }

    function drawLegendBottom() {
        var sHtml = '<section class="leSect">';
        //for (var i = 0; i < gSeriesData.length; i++)
        //{
        //    if (gSeriesData[i].length <= 0)
        //    {
        //        continue;
        //    }
        //    var sSerieName = gSeriesData[i][0].name;
        //    var sSerieTitle = gSeriesData[i][0].key + '(' + gSeriesData[i][0].mode + ')';
        for (var i = 0; i < gSeriesName.length; i++) {
            var sSerieName = 'series_' + i.toString();
            var sSerieTitle = '';
            if (gSeriesName[i].substring(0, gSeriesName[i].length - 5) == gParams.tag_set[i].tag_names && gAlias[i] != '') {
                sSerieTitle = gAlias[i];
            } else {
                sSerieTitle = gSeriesName[i];
            }
            if (
                gSeriesData.findIndex(function (sArray) {
                    return sArray.length > 0 && sArray[0].name == sSerieName;
                }) < 0
            ) {
                sHtml +=
                    '<div class="legendbottom-div" id="_l' +
                    sSerieName +
                    '">\
                    <span class="glyphicon glyphicon-minus changeAlias" style="color:' +
                    gZ(sSerieName) +
                    ';"></span>\
                    <span data-toggle="tooltip" title="' +
                    sSerieTitle +
                    '">\
                        <span style="margin-left:5px;cursor:default;">' +
                    sSerieTitle +
                    '</span>\
                    </span>\
                </div>';
            } else {
                sHtml +=
                    '<div class="legendbottom-div" id="_l' +
                    sSerieName +
                    '">\
                    <span class="glyphicon glyphicon-minus changeAlias" style="color:' +
                    gZ(sSerieName) +
                    ';"></span>\
                    <span data-toggle="tooltip" title="' +
                    sSerieTitle +
                    '">\
                        <a class="legendclick legendbottom-text" data-series="' +
                    sSerieName +
                    '">' +
                    sSerieTitle +
                    '</a>\
                    </span>\
                </div>';
            }
        }
        sHtml += '</section>';
        sHtml +=
            '<div class="leBtnBox">\
                    <p class ="leBtns upBtn"></p>\
                    <p class ="leBtns dwBtn"></p>\
                </div>';
        d3.select(gMainDiv).select('._legendbottom').html(sHtml);

        $(gMainDiv + ' .legendclick')
            .unbind('click')
            .click(function () {
                var sName = $(this).data('series');
                legendClick(sName);
            });

        $(gMainDiv + ' .changeAlias')
            .unbind('cilck')
            .click(function () {
                var sName = $(this).parent().attr('id');
                callTagAliasModal(sName.replace('_l', ''));
            });

        $('.leSect').each(function () {
            if ($(this).prop('scrollHeight') > 40) {
                $(this).siblings('.leBtnBox').css('display', 'block');

                //legend scrolling control
                $(this)
                    .unbind()
                    .on('mousewheel DOMMouseScroll', function (e) {
                        var sEvent = e.originalEvent;
                        var delta = 0;
                        if (sEvent.detail) {
                            delta = sEvent.detail * -40;
                        } else {
                            delta = sEvent.wheelDelta;
                        }
                        var moveTop = $(this).scrollTop();
                        if (delta < 0) {
                            moveTop += 25;
                        } else {
                            moveTop -= 25;
                        }

                        $(this)
                            .stop(true, true)
                            .animate({ scrollTop: moveTop + 'px' }, 100);
                    });

                $(this)
                    .siblings()
                    .find('.leBtns')
                    .unbind()
                    .click(function () {
                        var moveTop = $(this).parent().siblings('.leSect').scrollTop();

                        if ($(this).hasClass('upBtn') == true) {
                            moveTop -= 25;
                        } else {
                            moveTop += 25;
                        }

                        $(this)
                            .parent()
                            .siblings('.leSect')
                            .stop(true, true)
                            .animate({ scrollTop: moveTop + 'px' }, 100);
                    });
            }
        });
    }

    function legendClick(aName) {
        var sId = '_a' + aName;
        var sLp = '';
        var sClicked = 'none';
        var sUseY2 = 'N';

        if (
            d3
                .select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sId)
                .size() > 0
        ) {
            gClickedName = aName;
            gClickedAxis = '';
            if (
                d3
                    .select(gMainDiv)
                    .select('._chartdiv')
                    .select('#' + sId)
                    .style('display') != 'none'
            ) {
                if (checkClicked()) {
                    sClicked = null;
                    gClickedName = '';
                }
            }
        }
        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length <= 0) {
                continue;
            }
            sLp = '_a' + gSeriesData[i][0].name;
            d3.select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sLp)
                .style('display', sClicked);
            sLp = '_p' + gSeriesData[i][0].name;
            d3.select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sLp)
                .style('display', sClicked);
            if (aName == gSeriesData[i][0].name) {
                sUseY2 = gSeriesData[i][0].use_y2;
            }
        }
        if (
            d3
                .select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sId)
                .size() > 0
        ) {
            d3.select(gMainDiv)
                .select('._chartdiv')
                .select('#_a' + aName)
                .style('display', null);
            d3.select(gMainDiv)
                .select('._chartdiv')
                .select('#_p' + aName)
                .style('display', null);
        }
        if (gUseY2Axis) {
            showAxis('axis-y');
            showAxis('axis-y2');
            if (sClicked) {
                // != null (display one)
                if (sUseY2 == 'Y') {
                    hideAxis('axis-y');
                    gG.selectAll('.axis-y2').selectAll('.tick line').style('stroke', $('.axis-y .tick line').css('stroke'));
                } else {
                    hideAxis('axis-y2');
                }
            }
        }
    }

    function checkClicked() {
        var sReturn = false;
        var sLp = '';
        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length <= 0) {
                continue;
            }
            sLp = '_a' + gSeriesData[i][0].name;
            if (
                d3
                    .select(gMainDiv)
                    .select('._chartdiv')
                    .select('#' + sLp)
                    .style('display') == 'none'
            ) {
                sReturn = true;
                break;
            }
        }
        return sReturn;
    }

    function showAxis(aAxisClass) {
        var sClass = '.' + aAxisClass;
        gG.selectAll(sClass).selectAll('text').style('display', null);
        gG.selectAll(sClass).selectAll('.tick line').style('display', null);
        gG.selectAll(sClass).selectAll('.tick line').style('stroke', null);
    }

    function hideAxis(aAxisClass) {
        var sClass = '.' + aAxisClass;
        gG.selectAll(sClass).selectAll('text').style('display', 'none');
        gG.selectAll(sClass).selectAll('.tick line').style('display', 'none');
    }

    function handleAxisClick1() {
        axisClick('axis-y');
    }

    function handleAxisClick2() {
        axisClick('axis-y2');
    }

    function axisClick(aClassName) {
        var sClicked = 'none';
        var sShowAll = false;
        var sUseY2 = aClassName == 'axis-y' ? 'N' : 'Y';
        var sLp = '';

        gClickedAxis = aClassName;
        gClickedName = '';
        if (checkClicked()) {
            sShowAll = true;
            gClickedAxis = '';
        }

        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length <= 0) {
                continue;
            }
            if (sShowAll || gSeriesData[i][0].use_y2 == sUseY2) {
                sClicked = null;
            } else {
                sClicked = 'none';
            }
            sLp = '_a' + gSeriesData[i][0].name;
            d3.select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sLp)
                .style('display', sClicked);
            sLp = '_p' + gSeriesData[i][0].name;
            d3.select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sLp)
                .style('display', sClicked);
        }
        showAxis('axis-y');
        showAxis('axis-y2');
        if (!sShowAll) {
            if (sUseY2 == 'Y') {
                hideAxis('axis-y');
                gG.selectAll('.axis-y2').selectAll('.tick line').style('stroke', $('.axis-y .tick line').css('stroke'));
            } else {
                hideAxis('axis-y2');
            }
        }
    }

    function handleAxisMouseOver1() {
        AxisMouseOver('N');
    }

    function handleAxisMouseOver2() {
        AxisMouseOver('Y');
    }

    function AxisMouseOver(aUseY2) {
        var sNm = '';
        var sLl = '';
        var sLp = '';
        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length <= 0) {
                continue;
            }
            sNm = gSeriesData[i][0].name;
            sLl = '_l' + sNm;
            sLp = '_p' + sNm;
            if (gSeriesData[i][0].use_y2 == aUseY2) {
                d3.select(gMainDiv)
                    .select('._chartdiv')
                    .select('#' + sLp + ' path')
                    .style('stroke-width', (parseInt(gStroke) * 3).toString() + 'px');
                $(gMainDiv + ' #' + sLl + ' span a').css('color', gZ(sNm));
            } else {
                d3.select(gMainDiv)
                    .select('._chartdiv')
                    .select('#' + sLp + ' path')
                    .style('stroke-width', null);
                $(gMainDiv + ' #' + sLl + ' span a').css('color', '');
            }
        }
    }

    function handleAxisMouseOut() {
        var sNm = '';
        var sLl = '';
        var sLp = '';
        for (var i = 0; i < gSeriesData.length; i++) {
            if (gSeriesData[i].length <= 0) {
                continue;
            }
            sNm = gSeriesData[i][0].name;
            sLl = '_l' + sNm;
            sLp = '_p' + sNm;
            d3.select(gMainDiv)
                .select('._chartdiv')
                .select('#' + sLp + ' path')
                .style('stroke-width', null);
            $(gMainDiv + ' #' + sLl + ' span a').css('color', '');
        }
    }
    //////////////// Legend function (end) //////////////////////////
}

function splitTimeNow(aTime) {
    var sTime = aTime.replace(/\s/gi, '');
    var sRet = { success: false, error: 'now', sign: 0, value: 0, unit: '', text: 'now', splited: '' }; // default
    var sNowIdx = sTime.indexOf('now');
    var sSlashIdx = sTime.indexOf('/');
    var sTemp = '';

    if (sTime === 'now') {
        sRet.success = true;
        return sRet;
    }

    if (sNowIdx === sSlashIdx - 3) {
        // now/d, now/w, now/M, now/y
        sRet.success = true;
        sRet.splited = sTime.slice(sSlashIdx + 1);
        return sRet;
    }

    if (sNowIdx < 0) {
        return sRet;
    }

    if (sSlashIdx >= 0) {
        sRet.splited = sTime.slice(sSlashIdx + 1, sSlashIdx + 2);
        sTemp = sTime.slice(sNowIdx + 3, sSlashIdx).trim();
    } else {
        sTemp = sTime.slice(sNowIdx + 3).trim();
    }

    var sOptr = sTemp.slice(0, 1);

    if (sOptr !== '-' && sOptr !== '+') {
        sRet.error = 'sign';
        return sRet;
    }

    sRet.sign = parseInt(sOptr + '1');

    if (sSlashIdx >= 0) {
        sTemp = sTemp.slice(1, sSlashIdx).trim();
    } else {
        sTemp = sTemp.slice(1).trim();
    }

    var sUnitS = sTemp.slice(-1);

    if (sUnitS !== 's' && sUnitS !== 'm' && sUnitS !== 'h' && sUnitS !== 'd' && sUnitS !== 'w' && sUnitS !== 'M' && sUnitS !== 'y') {
        sRet.error = 'unit';
        return sRet;
    }

    sRet.unit = sUnitS;

    var sVals = parseInt(sTemp.slice(0, -1).trim());

    if (isNaN(sVals)) {
        sRet.error = 'value';
        return sRet;
    }

    sRet.success = true;
    sRet.value = sVals;
    sRet.text = sTime;
    // sRet.text = 'now' + (sRet.sign > 0 ? '+' : '-') + sRet.value + sRet.unit;

    return sRet;
}

function DateToString(aDt) {
    var sRet = d3.format('04d')(aDt.getFullYear()) + '-' + d3.format('02d')(aDt.getMonth() + 1) + '-' + d3.format('02d')(aDt.getDate()) + ' ';
    sRet += d3.format('02d')(aDt.getHours()) + ':' + d3.format('02d')(aDt.getMinutes()) + ':' + d3.format('02d')(aDt.getSeconds());
    return sRet;
}

function getUnitStr(aUnit) {
    var sStr = '';

    switch (aUnit) {
        case 's':
            sStr = 'second';
            break;
        case 'm':
            sStr = 'minute';
            break;
        case 'h':
            sStr = 'hour';
            break;
        case 'd':
            sStr = 'day';
            break;
        case 'w':
            sStr = 'week';
            break;
        case 'M':
            sStr = 'month';
            break;
        case 'y':
            sStr = 'year';
            break;
    }

    return sStr;
}

function getMinMaxDate(aTag, aTimeOut, aTRSet, aServerInfo) {
    if (aTimeOut == null) {
        aTimeOut = 20000;
    }
    if (aServerInfo == null) {
        aServerInfo = { db_ip: '', db_port: '', db_user: '', db_pass: '', db_server: '', use_custom: 'N' }; // use_custom : I(p) | S(erver) | N(o)
    }
    var sTimeOut = aTimeOut;
    var sTag = aTag;
    //var sUrl = '/machiot-rest-api/tags/range/' + sTag;
    //sUrl += setServerInfoParams(aServerInfo);
    var sUrl = '/machiot-rest-api/tags/range';
    var sTemp1 = { tag: sTag };
    var sTemp2 = setServerInfoParams(aServerInfo);
    var sData = $.extend({}, sTemp1, sTemp2);

    return $.ajax({
        url: sUrl,
        type: 'GET',
        dataType: 'json',
        timeout: sTimeOut,
        data: sData,
        error: function (request, status, error) {
            //console.log("code:"+request.status+"\n"+"message:"+request.responseText+"\n"+"error:"+error);
            ajaxErrorProcess(request, status, error, sTimeOut, sUrl);
        },
        success: function (d) {
            if (d.error_code != 0) {
                aTRSet.begin = '';
                aTRSet.end = '';
            } else {
                var sData = d.Data;
                if (sData.length > 0) {
                    var sRange = makeKeyUpper(sData[0]);
                    var sTmpBgn = sRange['MIN'].substring(0, 19) + ' 000:000:000';
                    var sTmpEnd = sRange['MAX'].substring(0, 19) + ' 999:999:999';

                    if (aTRSet.begin == '' || d3.timeParse('%Y-%m-%d %H:%M:%S')(aTRSet.begin.substring(0, 19)) > d3.timeParse('%Y-%m-%d %H:%M:%S')(sTmpBgn.substring(0, 19))) {
                        aTRSet.begin = sTmpBgn;
                    }
                    if (aTRSet.begin == '' || d3.timeParse('%Y-%m-%d %H:%M:%S')(aTRSet.end.substring(0, 19)) < d3.timeParse('%Y-%m-%d %H:%M:%S')(sTmpEnd.substring(0, 19))) {
                        aTRSet.end = sTmpEnd;
                    }
                } else {
                    aTRSet.begin = '';
                    aTRSet.end = '';
                }
            }
        },
    });
}

function setServerInfoParams(aServerInfo) {
    /*
    var sReturn = '';
    if (aServerInfo.use_custom == 'I')  // I(p) | S(erver) | N(o)
    {
        sReturn += '?ip=' + aServerInfo.db_ip;
        sReturn += '&port=' + aServerInfo.db_port;
        sReturn += '&user=' + aServerInfo.db_user;
        sReturn += '&pass=' + aServerInfo.db_pass;
    }
    else if (aServerInfo.use_custom == 'S')  // I(p) | S(erver) | N(o)
    {
        sReturn += '?svr=' + aServerInfo.db_server;
    }
*/
    var sReturn = {};
    if (aServerInfo.use_custom == 'I') {
        // I(p) | S(erver) | N(o)
        sReturn['ip'] = aServerInfo.db_ip;
        sReturn['port'] = aServerInfo.db_port;
        sReturn['user'] = aServerInfo.db_user;
        sReturn['pass'] = aServerInfo.db_pass;
    } else if (aServerInfo.use_custom == 'S') {
        // I(p) | S(erver) | N(o)
        sReturn['svr'] = aServerInfo.db_server;
    }
    return sReturn;
}

function ajaxErrorProcess(aRequest, aStatus, aError, aTimeOut, aUrl) {
    if (aUrl == null) {
        aUrl = '';
    }
    if (aRequest.hasOwnProperty('responseText')) {
        console.log(
            'code   : ' + aRequest.status + '\nmessage: ' + aRequest.responseText + '\nstatus : ' + aStatus + '\nerror  : ' + aError + (aUrl == '' ? '' : '\nurl    : ' + aUrl)
        );
    } else {
        if (aStatus == 'timeout') {
            var sTimeOut = Math.floor(aTimeOut / 1000).toString();
            console.log('The server did not respond within the specified time.(' + sTimeOut + ' seconds)' + (aUrl == '' ? '' : '\nurl    : ' + aUrl));
        } else {
            console.log('Can not receive a response from the server.\nCheck the status of the server.' + (aUrl == '' ? '' : '\nurl    : ' + aUrl));
        }
    }
}

function makeKeyUpper(aJson) {
    var sJson = {};
    $.each(aJson, function (key, val) {
        sJson[key.toUpperCase()] = val;
    });
    return sJson;
}

if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (predicate) {
        if (this === null) {
            throw new TypeError('Array.prototype.findIndex called on null or undefined');
        }
        if (typeof predicate !== 'function') {
            throw new TypeError('predicate must be a function');
        }
        //const list = Object(this);
        //const length = list.length >>> 0;
        //const thisArg = this;
        var _list = Object(this);
        var _length = _list.length >>> 0;
        var _thisArg = this;

        //let value;
        //for (let i = 0; i < _length; i++) {
        var _value;
        for (var _i = 0; _i < _length; _i++) {
            _value = _list[_i];
            if (predicate.call(_thisArg, _value, _i, _list)) {
                return _i;
            }
        }
        return -1;
    };
}
