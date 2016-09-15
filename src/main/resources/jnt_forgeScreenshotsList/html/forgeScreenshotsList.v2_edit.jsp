<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>

<template:addResources type="javascript" resources="jquery-ui.min.js"/>
<template:addResources type="javascript" resources="jquery.fileupload-with-ui.min.js"/>
<template:addResources type="css" resources="appStore.css, forge.css, forge.edition.css, jquery.fileupload.css, bootstrap3-wysihtml5.min.css, bootstrap-editable.css, bootstrap-wysihtml5.css, jqtree.css, select2.css, select2.bootstrap.css"/>
<template:addResources type="css" resources="jquery-ui.smoothness.css"/>

<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="isDeveloper" value="${jcr:hasPermission(currentNode, 'jcr:write')}"/>

<c:if test="${isDeveloper}">
    <c:set var="viewAsUser" value="${not empty param['viewAs'] && param['viewAs'] eq 'user'}"/>
</c:if>

<template:include view="hidden.header"/>
<c:set var="columnsNumber" value="4"/>
<template:addResources type="inlinejavascript">
    <script type="text/javascript">
        $(document).ready(function() {
            $('#moduleScreenshotsList').sortable({
                revert: true
            });

            $('#moduleScreenshotsList').on('sortstop', function(event, ui) {

                var movedScreenshot = $(ui.item[0]);
                var folder = movedScreenshot.attr("data-parent-path");

                var data = {};
                data['source'] = folder + "/" + movedScreenshot.attr("data-name");

                if (movedScreenshot.is(':last-child')) {
                    data['target'] = folder;
                    data['action'] = "moveAfter";
                }
                else {
                    data['target'] = folder + "/" + movedScreenshot.next().attr("data-name");
                    data['action'] = "moveBefore";
                }

                $.post('<c:url value="${url.base}${currentNode.path}.move.do"/>', data, function () {

                }, "json");

            });

            $('.remove-screenshot').click(function() {
                var listItem = $(this).parent('li.moduleScreenshot');
                $.post($(this).attr('data-path'), {jcrMethodToCall: 'delete'}, function() {
                    if($('#moduleScreenshotsList li').length == 1)
                        $('#moduleDeveloperPanel').triggerHandler('forgeModuleUpdated');
                    listItem.fadeOut('slow', function() {listItem.remove()});
                }, "json");
            });

            $('#moduleScreenshotsList, #moduleScreenshotsList li').disableSelection();
        });
    </script>
</template:addResources>
<div class="row-fluid">
    <ul id="moduleScreenshotsList" class="thumbnails">
        <c:forEach var="moduleScreenshot" items="${moduleMap.currentList}" varStatus="status">
            <li class="moduleScreenshot span${functions:round(12/columnsNumber)}${status.index % columnsNumber eq 0 ? '' : ''}"
                data-name="${moduleScreenshot.name}" data-parent-path="${moduleScreenshot.parent.path}">
                <img class="move-screenshot" src="${moduleScreenshot.thumbnailUrls['thumbnail2']}"/>
                <a class="remove-screenshot" data-path="<c:url value='${url.base}${moduleScreenshot.path}'/>"
                   href="#"><i class="icon-remove"></i>&nbsp;<fmt:message key="jnt_forgeEntry.label.remove"/></a>
            </li>
        </c:forEach>
    </ul>
</div>
<template:tokenizedForm allowsMultipleSubmits="true">
    <form class="file_upload" id="file_upload_${currentNode.identifier}"
          action="<c:url value='${url.base}${currentNode.parent.path}'/>" method="POST" enctype="multipart/form-data"
          accept="application/json">
        <div id="file_upload_container" class="btn btn-block">
            <input type="file" name="file" accept="image/*" multiple>
            <%--<
                button><fmt:message key="forge.uploadScreenshots.label"/></button>
                <div id="drop-box-file-upload-${currentNode.identifier}"><fmt:message key="forge.uploadScreenshots.label"/></div>
            --%>
        </div>
        <c:url var="targetNodePath" value="${url.base}${renderContext.mainResource.node.path}.screenshots.html.ajax">
            <c:param name="targetNodePath" value="${moduleScreenshot.parent.path}"/>
        </c:url>
    </form>
</template:tokenizedForm>
<table id="files${currentNode.identifier}" class="table"></table>
<script>
    /*global $ */
    $(function () {
        $('#file_upload_${currentNode.identifier}').fileUploadUI({
            namespace: 'file_upload_${currentNode.identifier}',
            onComplete: function (event, files, index, xhr, handler) {
                window.location = "<c:url value="${url.base}${renderContext.mainResource.node.path}.store-module-v2.html"/>";
            },
            acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
            uploadTable: $('#files${currentNode.identifier}'),
            dropZone: $('#file_upload_container'),
            beforeSend: function (event, files, index, xhr, handler, callBack) {
                handler.formData = {
                    'jcrNodeType': "jnt:file",
                    'jcrReturnContentType': "json",
                    'jcrReturnContentTypeOverride': 'application/json; charset=UTF-8',
                    'jcrRedirectTo': "<c:url value='${url.base}${renderContext.mainResource.node.path}'/>",
                    'jcrNewNodeOutputFormat': "${renderContext.mainResource.template}.html",
                    'form-token': $('#file_upload_${currentNode.identifier} input[name=form-token]').val()
                };
                callBack();
            },
            buildUploadRow: function (files, index) {
                return $('<tr><td>' + files[index].name + '<\/td>' +
                        '<td class="file_upload_progress"><div><\/div><\/td>' + '<td class="file_upload_cancel">' +
                        '<button class="ui-state-default ui-corner-all" title="Cancel">' +
                        '<span class="ui-icon ui-icon-cancel">Cancel<\/span>' + '<\/button><\/td><\/tr>');
            }
        });
    });
</script>