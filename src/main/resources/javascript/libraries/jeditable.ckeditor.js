/*
 * CKEditor input for Jeditable
 *
 * Adapted from Wysiwyg input for Jeditable by Mike Tuupola
 *   http://www.appelsiini.net/2008/9/wysiwyg-for-jeditable
 *
 * Copyright (c) 2009 Jeremy Bell
 *
 * Licensed under the MIT license:
 *   http://www.opensource.org/licenses/mit-license.php
 *
 * Depends on CKEditor:
 *   http://ckeditor/
 *
 * Revision: $Id$
 *
 */

$.editable.addInputType('ckeditor', {
    /* Use default textarea instead of writing code here again. */
    //element : $.editable.types.textarea.element,
    element : function(settings, original) {
        /* Hide textarea to avoid flicker. */
        var textarea = $('<textarea>').css("opacity", "0");
        textarea.attr('id', "ck_"+settings.id);
        if (settings.rows) {
            textarea.attr('rows', settings.rows);
        } else {
            textarea.height(settings.height);
        }
        if (settings.cols) {
            textarea.attr('cols', settings.cols);
        } else {
            textarea.width(settings.width);
        }
        $(this).append(textarea);
        alert("Element");
        return(textarea);
    },
    content : function(string, settings, original) {
        /* jWYSIWYG plugin uses .text() instead of .val()        */
        /* For some reason it did not work work with generated   */
        /* textareas so I am forcing the value here with .text() */
        $('textarea', this).text(string);
        alert("content");
    },
    plugin : function(settings, original) {
        var self = this;
        if (settings.ckeditor) {
            setTimeout(function() { CKEDITOR.replace("ck_"+settings.id, settings.ckeditor); alert("plugin");}, 0);
        } else {
            setTimeout(function() { CKEDITOR.replace("ck_"+settings.id); alert("plugin");}, 0);
        }

    },
    submit : function(settings, original) {
        $('textarea', this).val(CKEDITOR.instances[$('textarea', this).attr('id')].getData());
        CKEDITOR.instances[$('textarea', this).attr('id')].destroy();
        alert("submit");
    }
});