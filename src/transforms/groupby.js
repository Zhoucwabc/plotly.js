/**
* Copyright 2012-2016, Plotly, Inc.
* All rights reserved.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/

'use strict';

var Lib = require('../lib');

exports.moduleType = 'transform';

exports.name = 'groupby';

exports.attributes = {
    active: {
        valType: 'boolean',
        dflt: true,
        description: [
            'Toggles whether or not the filter is active.'
        ].join(' ')
    },
    groups: {
        valType: 'data_array',
        dflt: [],
        description: [
            'Sets the groups in which the trace data will be split.',
            'For example, with `x` set to *[1, 2, 3, 4]* and',
            '`groups` set to *[\'a\', \'b\', \'a\', \'b\']*,',
            'the groupby transform with split in one trace',
            'with `x` [1, 3] and one trace with `x` [2, 4].'
        ].join(' ')
    },
    style: {
        valType: 'any',
        dflt: {},
        description: [
            'Sets each group style.',
            'For example, with `groups` set to *[\'a\', \'b\', \'a\', \'b\']*',
            'and `style` set to *{ a: { marker: { color: \'red\' } }}',
            'marker points in group *\'a\'* will be drawn in red.'
        ].join(' ')
    }
};

/**
 * Supply transform attributes defaults
 *
 * @param {object} transformIn
 *  object linked to trace.transforms[i] with 'type' set to exports.name
 * @param {object} fullData
 *  the plot's full data
 * @param {object} layout
 *  the plot's (not-so-full) layout
 *
 * @return {object} transformOut
 *  copy of transformIn that contains attribute defaults
 */
exports.supplyDefaults = function(transformIn) {
    var transformOut = {};

    function coerce(attr, dflt) {
        return Lib.coerce(transformIn, transformOut, exports.attributes, attr, dflt);
    }

    var active = coerce('active');

    if(!active) return transformOut;

    coerce('groups');
    coerce('style');

    // or some more complex logic using fullData and layout

    return transformOut;
};

/**
 * Apply transform !!!
 *
 * @param {array} data
 *  array of transformed traces (is [fullTrace] upon first transform)
 *
 * @param {object} state
 *  state object which includes:
 *      - transform {object} full transform attributes
 *      - fullTrace {object} full trace object which is being transformed
 *      - fullData {array} full pre-transform(s) data array
 *      - layout {object} the plot's (not-so-full) layout
 *
 * @return {object} newData
 *  array of transformed traces
 */
exports.transform = function(data, state) {

    // one-to-many case

    var newData = [];

    data.forEach(function(trace, i) {

        newData = newData.concat(transformOne(trace, state, state.attributeSets[i]));
    });

    return newData;
};

function initializeArray(newTrace, a) {
    Lib.nestedProperty(newTrace, a).set([]);
}

function pasteArray(newTrace, trace, j, a) {
    Lib.nestedProperty(newTrace, a).set(
        Lib.nestedProperty(newTrace, a).get().concat([
            Lib.nestedProperty(trace, a).get()[j]
        ])
    );
}

function transformOne(trace, state) {
    var opts = state.transform;
    var groups = trace.transforms[state.transformIndex].groups;

    var groupNames = groups.filter(function(g, i, self) {
        return self.indexOf(g) === i;
    });

    if(!(Array.isArray(groups)) || groups.length === 0) {
        return trace;
    }

    var newData = new Array(groupNames.length);
    var len = groups.length;

    var arrayAttrs = Lib.findArrayAttributes(trace);

    var style = opts.style || {};

    for(var i = 0; i < groupNames.length; i++) {
        var groupName = groupNames[i];

        // TODO is this the best pattern ???
        // maybe we could abstract this out
        var newTrace = newData[i] = Lib.extendDeep({}, trace);

        arrayAttrs.forEach(initializeArray.bind(null, newTrace));

        for(var j = 0; j < len; j++) {
            if(groups[j] !== groupName) continue;

            arrayAttrs.forEach(pasteArray.bind(0, newTrace, trace, j));
        }

        newTrace.name = groupName;

        //  there's no need to coerce style[groupName] here
        // as another round of supplyDefaults is done on the transformed traces
        newTrace = Lib.extendDeep(newTrace, style[groupName] || {});
    }

    return newData;
}
