<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="uiComponents" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="forge" uri="http://www.jahia.org/modules/forge/tags" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<template:addResources type="javascript" resources="libraries/zoom/zoom.js"/>
<template:addResources type="javascript" resources="libraries/fileinput/fileinput.js"/>
<template:addResources type="css" resources="libraries/fileinput.css"/>
<template:addResources type="javascript" resources="ckeditor.js"/>
<template:addCacheDependency node="${moduleMap.latestVersion}"/>
<template:addCacheDependency path="${currentNode.path}/screenshots"/>
<c:set var="hasRepositoryAccess" value="${jcr:hasPermission(currentNode, 'repositoryExplorer')}"/>
<%@include file="../../commons/authorName.jspf" %>
<jsp:useBean id="uniqueDependants" class="java.util.LinkedHashMap"/>
<jcr:sql
        var="query"
        sql="SELECT * FROM [jnt:forgeModuleVersion] AS moduleVersion
            WHERE isdescendantnode(moduleVersion,['${currentNode.path}'])"
/>
<c:set var="sortedModules" value="${forge:sortByVersion(query.nodes)}"/>
<c:set target="${moduleMap}" property="latestVersion" value="${forge:latestVersion(sortedModules)}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<c:set var="description" value="${currentNode.properties['description'].string}"/>
<c:set var="howToInstall" value="${currentNode.properties['howToInstall'].string}"/>
<c:set var="authorURL" value="${currentNode.properties['authorURL'].string}"/>
<c:set var="authorEmail" value="${currentNode.properties['authorEmail'].string}"/>
<c:set var="published" value="${currentNode.properties['published'].boolean}"/>

<c:set var="hasVideoNode" value="${jcr:hasChildrenOfType(currentNode, 'jnt:videostreaming')}"/>
<c:if test="${hasVideoNode}">
    <jcr:node var="videoNode" path="${currentNode.path}/video"/>
    <c:set var="videoProvider" value="${videoNode.properties['provider'].string}"/>
    <c:set var="videoIdentifier" value="${videoNode.properties['identifier'].string}"/>
    <c:set var="videoHeight" value="${videoNode.properties['height'].string}"/>
    <c:set var="videoWidth" value="${videoNode.properties['width'].string}"/>
    <c:set var="videoAllowfullscreen" value="${videoNode.properties['allowfullscreen'].string}"/>
</c:if>

<c:set var="FAQ" value="${currentNode.properties['FAQ'].string}"/>
<c:if test="${fn:length( fn:trim( functions:removeHtmlTags( fn:replace(FAQ, '&nbsp;', ' ') ))) eq 0
                        && (not isDeveloper || viewAsUser)}">
    <c:set var="emptyFAQ" value="true"/>
</c:if>

<jcr:nodeProperty node="${moduleMap.latestVersion}" name="versionNumber" var="versionNumber"/>
<jcr:nodeProperty node="${currentNode}" name="j:tagList" var="assignedTags"/>
<jcr:node var="screenshots" path="${currentNode.path}/screenshots"/>

<c:forEach items="${currentNode.properties['j:defaultCategory']}" var="cat" varStatus="vs">
    <c:set var="category" value="${cat}"/>
</c:forEach>

<%--Icon url--%>
<c:url var="iconUrl" value="${url.currentModule}/img/icon.png"/>
<jcr:node var="iconFolder" path="${currentNode.path}/icon"/>
<c:forEach var="iconItem" items="${iconFolder.nodes}">
    <c:set var="icon" value="${iconItem}"/>
</c:forEach>

<c:set var="moduleStatus"
       value="${not empty currentNode.properties['status'].string?currentNode.properties['status'].string:'community'}"/>
<c:if test="${moduleStatus eq 'supported' or currentNode.properties['supportedByJahia'].boolean}">
    <c:set var="moduleStatus" value="supported"/>
</c:if>
<c:forEach items="${jcr:getChildrenOfType(screenshots,'jmix:image')}" var="screenshot" varStatus="stat">
    <c:set var="preload">${preload}'${screenshot.url}'<c:if
            test="${not stat.last}">,</c:if></c:set>
</c:forEach>
<script>
    var tagsList = [];
    <c:forEach items="${currentNode.properties['j:tagList']}" var="tag">
    tagsList.push('${fn:toLowerCase(tag.string)}');
    </c:forEach>
    function addTag() {
        var newTagVal = $('#newTag').val();
        if (newTagVal.trim() != "") {
            tagsList.push(newTagVal.toLowerCase());
            $('#newTag').val('')
            renderLists();
            addEventOnTagItem();
        }
    }

    function renderLists() {
        var $metaForm = $(".hidden-tag-item");
        $metaForm.empty();
        for (var j = 0; j < tagsList.length; j++) {
            $metaForm.append('<input type="hidden" name="j:tagList" value="' + tagsList[j] + '">');
        }
        var $tagsList;
        for (var k = 0; k < tagsList.length; k++) {
            if ((k % 5) == 0) {
                $tagsList = $("#tagsList" + Math.round(k / 5));
                if ($tagsList.length > 0) {
                    $tagsList.empty();
                } else {
                    $tagsList = $("#tagsList0");
                }
            }
            $tagsList.append('<li class="list-group-item tag-item">' + tagsList[k].toUpperCase() + '</li>');
        }
        if (tagsList.length <= 10 && $("#tagsList2").length > 0) {
            $("#tagsList2").empty()
        }
        if (tagsList.length <= 5 && $("#tagsList1").length > 0) {
            $("#tagsList1").empty()
        }
        if (tagsList.length == 0) {
            $("#tagsList0").empty();
        }
    }
    function addEventOnTagItem() {
        if (tagsList.length > 1) {
            $(".tag-item").css('cursor', 'pointer');
            $(".tag-item").mouseover(function () {
                $(this).addClass('list-group-item-danger')
            });
            $(".tag-item").mouseout(function () {
                $(this).removeClass('list-group-item-danger')
            });
            $(".tag-item").click(function () {
                var value = $(this).html().toLowerCase().trim();
                for (var i = 0; i < tagsList.length; i++) {
                    if (tagsList[i] == value) {
                        tagsList.splice(i, 1);
                        break;
                    }
                }
                renderLists();
                addEventOnTagItem();
            });
        } else {

        }
    }

    function updateCompletionStatus() {
        $.get('<c:url value='${url.base}${currentNode.path}.calculateCompletion.do'/>', function (data) {
            var completion     = data['completion'];
            var canBePublished = data['canBePublished'];
            var bar            = $('#completion').css('width', completion + "%");
            bar.children('.ratingCount').html(completion + "%");
            if (completion < 60) {
                bar.removeClass('progress-bar-success');
                bar.removeClass('progress-bar-warning');
                bar.addClass('progress-bar-danger');
            }
            else if (!canBePublished) {
                bar.removeClass('progress-bar-success');
                bar.removeClass('progress-bar-danger');
                bar.addClass('progress-bar-warning');
            }
            else {
                bar.removeClass('progress-bar-danger');
                bar.removeClass('progress-bar-warning');
                bar.addClass('progress-bar-success');
            }
            if (canBePublished)
                $('#publishModule').removeClass('disabled');
            else
                $('#publishModule').addClass('disabled').removeClass("btn-danger");
            var todoList        = $('#todoList');
            var todoListWrapper = $('#todoListWrapper');
            if (completion == 100) {
                todoListWrapper.slideUp();
                todoList.empty().addClass('completed');
            }
            else {
                var items            = [];
                var hasMandatoryLeft = false;
                $.each(data['todoList'], function (key, val) {
                    if (!hasMandatoryLeft && val['mandatory']) {
                        hasMandatoryLeft = true;
                    }
                    items.push('<li' + (val['mandatory'] ? ' class="list-group-item list-group-item-danger"' : ' class="list-group-item list-group-item-info"' ) + '>' + val['name'] + '</li>');
                });
                if (!hasMandatoryLeft) {
                    $('span#mandatoryTodoList').hide();
                }
                else {
                    $('span#mandatoryTodoList').show();
                }
                todoList.empty().append(items.join(''));
                if (todoList.hasClass('completed')) {
                    todoListWrapper.slideDown();
                    todoList.removeClass('completed');
                }
            }
        }, "json");
    }

    function publishModule(attribute) {
        var btn         = $('#publishModule');
        var data        = {};
        data['publish'] = attribute;
        $.post('<c:url value='${url.base}${currentNode.path}.publishModule.do'/>', data, function (result) {
            var published = result['published'];
            if (result['published'] != null) {
                //btn.toggleClass('btn-success btn-danger');
                btn.attr("data-value", result['published']);
                if (published) {
                    //btn.text('<fmt:message key="jnt_forgeEntry.label.developer.unpublish"/>');
                    window.location.reload();
                }
                else {
                    // btn.text('<fmt:message key="jnt_forgeEntry.label.developer.publish"/>');
                    window.location.reload();
                }
            }
        }, "json");
    }

    $(document).ready(function () {
        $("#file").fileinput({
            uploadUrl           : "<c:url value='${url.base}${currentNode.path}.updateModuleIcon.do'/>", // server upload action
            uploadAsync         : true,
            maxFileCount        : 1,
            allowedFileTypes    : ['image'],
            initialPreviewAsData: true,
            initialPreview      : [
                '${not empty icon.url ? icon.url : iconUrl}'
            ]
        });

        $("#screenshots").fileinput({
            uploadUrl              : "<c:url value='${url.base}${currentNode.path}/screenshots/*'/>", // server upload action
            uploadAsync            : true,
            maxFileCount           : 10,
            allowedFileTypes       : ['image'],
            preferIconicZoomPreview: false,
            initialPreviewAsData   : true,
            initialPreview         : [${preload}],
            initialPreviewConfig   : [
                    <c:forEach items="${jcr:getChildrenOfType(screenshots,'jmix:image')}" var="screenshot" varStatus="stat">{
                    url: '<c:url value="${url.base}${screenshot.path}.deleteScreenshot.do"/>'
                }<c:if test="${not stat.last}">, </c:if>
                </c:forEach>
            ]

        });
        //Initializing ck editors
        $('.ckarea').each(function (index, object) {
            var textarea = $(object);
            CKEDITOR.replace(textarea.attr('id'), {
                toolbar: 'Basic'
            });
        });

        addEventOnTagItem();
        updateCompletionStatus();
        $("#publishModule").click(function () {
            publishModule($(this).data('publish'));
        });
    });
</script>

<div class="container" style="margin-top: 50px;">
    <div class="row">
        <div class="col-md-3">
            <div class="row">
                <div class="col-md-12">
                    <template:tokenizedForm allowsMultipleSubmits="true">
                        <form action="<c:url value='${url.base}${currentNode.path}.updateModuleIcon.do'/>"
                              method="POST" enctype="multipart/form-data">
                            <label for="file" class="control-label"><fmt:message
                                    key="forge.editModule.uploadIcon.label"/></label>
                            <input type="file" name="file" id="file" class="file-loading">

                        </form>
                    </template:tokenizedForm>
                </div>
                <div id="todoListWrapper" class="col-md-12">
                    <h6 class="title">
                        <fmt:message key="jnt_forgeEntry.label.developer.todoList"/>&nbsp;
                        <span id="mandatoryTodoList"><fmt:message
                                key="jnt_forgeEntry.label.developer.todoListMandatory"/></span>
                    </h6>
                    <ul id="todoList" class="list-group">
                    </ul>
                </div>
            </div>
        </div>
        <div class="col-md-9">
            <div class="row">
                <div class="col-md-10">
                    <h2>${title}
                        <c:choose>
                            <c:when test="${moduleStatus eq 'supported'}">
                            <span class="module-supported">
                                <i class="material-icons noselect" title="${moduleStatus}">check_circle</i>
                            </span>
                            </c:when>
                        </c:choose></h2>

                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="btn-group" role="group">
                        <a href="<c:url value="${url.base}${currentNode.path}.html"/>" class="btn btn-primary" target="_blank">
                            View
                        </a>
                        <button type="button" id="publishModule" class="btn btn-primary" data-publish="${!published}">
                            <c:choose>
                                <c:when test="${published}"><fmt:message
                                        key="jnt_forgeEntry.label.developer.unpublish"/></c:when>
                                <c:otherwise><fmt:message
                                        key="jnt_forgeEntry.label.developer.publish"/></c:otherwise>
                            </c:choose>
                        </button>
                    </div>
                </div>
                <div class="col-md-6">
                    <div id="completion" class="progress-bar" role="progressbar"><span
                            class="ratingCount"></span></div>
                </div>
            </div>
            <div class="row" style="margin-top: 10px">
                <div class="col-md-12">
                    <!-- Nav tabs -->
                    <ul class="nav nav-tabs" role="tablist">
                        <li role="presentation" class="active"><a href="#home" aria-controls="informations" role="tab"
                                                                  data-toggle="tab">Informations</a></li>
                        <li role="presentation"><a href="#installfaq" aria-controls="install" role="tab"
                                                   data-toggle="tab">Install/FAQ</a></li>
                        <li role="presentation"><a href="#medias" aria-controls="medias" role="tab"
                                                   data-toggle="tab">Medias</a></li>
                        <li role="presentation"><a href="#metadata" aria-controls="metadata" role="tab"
                                                   data-toggle="tab">Metadata</a>
                        <li role="presentation"><a href="#versions" aria-controls="versions" role="tab"
                                                   data-toggle="tab">Versions</a>
                        </li>
                    </ul>

                    <!-- Tab panes -->
                    <div class="tab-content">
                        <div role="tabpanel" class="tab-pane active" id="home">
                            <div class="row">
                                <div class="col-md-12" style="margin-top: 15px">
                                    <template:tokenizedForm allowsMultipleSubmits="true">
                                        <form class="form-horizontal"
                                              action="<c:url value='${url.base}${currentNode.path}'/>"
                                              method="post">
                                            <input type="hidden" name="jcrMethodToCall" value="PUT"/>
                                            <input type="hidden" name="jcrRedirectTo"
                                                   value="<c:url value='${url.base}${currentNode.path}.store-module-v2-edit'/>"/>
                                            <div class="form-group">
                                                <label for="title"
                                                       class="control-label col-sm-2">Name</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class="form-control" name="jcr:title" id="title"
                                                           value="${title}"/>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="description_editor"
                                                       class="control-label col-sm-2">Description</label>
                                                <div class="col-sm-10">
                                            <textarea class="ckarea form-control" name="description"
                                                      id="description_editor" rows="5" cols="60">
                                                <c:out value="${description}"/>
                                            </textarea>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="authorURL"
                                                       class="control-label col-sm-2">Author URL</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class="form-control" name="authorURL"
                                                           id="authorURL"
                                                           value="${authorURL}"/>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="authorEmail"
                                                       class="control-label col-sm-2">Author Email</label>
                                                <div class="col-sm-10">
                                                    <input type="text" class="form-control" name="authorEmail"
                                                           id="authorEmail"
                                                           value="${authorEmail}"/>
                                                </div>
                                            </div>
                                            <div class="form-group">
                                                <label for="authorNameDisplayedAs"
                                                       class="control-label col-sm-2">Display Author with</label>
                                                <div class="col-sm-10">
                                                    <select class="form-control"
                                                            name="authorNameDisplayedAs" id="authorNameDisplayedAs">
                                                        <option value="username"
                                                                <c:if test="${authorNameDisplayedAs eq 'username'}">selected</c:if>>
                                                            Username
                                                        </option>
                                                        <option value="fullName"
                                                                <c:if test="${authorNameDisplayedAs eq 'fullName'}">selected</c:if>>
                                                            Fullname
                                                        </option>
                                                        <option value="organisation"
                                                                <c:if test="${authorNameDisplayedAs eq 'organisation'}">selected</c:if>>
                                                            Organisation
                                                        </option>
                                                    </select>
                                                </div>
                                            </div>

                                            <button type="submit" class="btn btn-warning">Submit</button>
                                        </form>
                                    </template:tokenizedForm>
                                </div>
                            </div>
                        </div>
                        <div role="tabpanel" class="tab-pane" id="installfaq"><template:tokenizedForm
                                allowsMultipleSubmits="true">
                            <form class="form-horizontal" style="margin-top: 15px"
                                  action="<c:url value='${url.base}${currentNode.path}'/>"
                                  method="post">
                                <input type="hidden" name="jcrMethodToCall" value="PUT"/>
                                <input type="hidden" name="jcrRedirectTo"
                                       value="<c:url value='${url.base}${currentNode.path}.store-module-v2-edit'/>"/>
                                <div class="form-group">
                                    <label for="install"
                                           class="control-label col-sm-2">How To Install</label>
                                    <div class="col-sm-10">
                                            <textarea class="ckarea form-control" name="howToInstall"
                                                      id="install" rows="5" cols="60">
                                                <c:out value="${howToInstall}"/>
                                            </textarea>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="faq"
                                           class="control-label col-sm-2">FAQ</label>
                                    <div class="col-sm-10">
                                            <textarea class="ckarea form-control" name="FAQ"
                                                      id="faq" rows="5" cols="60">
                                                <c:out value="${FAQ}"/>
                                            </textarea>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-warning">Submit</button>
                            </form>
                        </template:tokenizedForm></div>
                        <div role="tabpanel" class="tab-pane" id="medias">
                            <div class="row">
                                <div class="col-md-12" style="margin-top: 15px">
                                    <template:tokenizedForm allowsMultipleSubmits="true">
                                        <form action="<c:url value='${url.base}${currentNode.path}/screenshots/*'/>"
                                              method="POST" enctype="multipart/form-data">
                                            <label for="screenshots" class="control-label">Screenshots</label>
                                            <input type="file" name="screenshots" id="screenshots" multiple
                                                   class="file-loading">
                                        </form>
                                    </template:tokenizedForm>
                                </div>
                            </div>
                        </div>
                        <div role="tabpanel" class="tab-pane" id="metadata">
                            <form class="form-horizontal" action="<c:url value='${url.base}${currentNode.path}'/>"
                                  style="margin-top: 15px"
                                  method="post" id="metaForm">
                                <input type="hidden" name="jcrMethodToCall" value="PUT"/>
                                <input type="hidden" name="jcrRedirectTo"
                                       value="<c:url value='${url.base}${currentNode.path}.store-module-v2-edit'/>"/>
                                <div class="form-group">
                                    <label for="status"
                                           class="control-label col-sm-2">Module Status</label>
                                    <div class="col-sm-10">
                                        <select class="form-control"
                                                name="status" id="status">
                                            <option value="community"
                                                    <c:if test="${authorNameDisplayedAs eq 'community'}">selected</c:if>>
                                                <fmt:message key="jnt_forgeEntry.status.community"/>
                                            </option>
                                            <option value="labs"
                                                    <c:if test="${authorNameDisplayedAs eq 'labs'}">selected</c:if>>
                                                <fmt:message key="jnt_forgeEntry.status.labs"/>
                                            </option>
                                            <option value="prereleased"
                                                    <c:if test="${authorNameDisplayedAs eq 'prereleased'}">selected</c:if>>
                                                <fmt:message key="jnt_forgeEntry.status.prereleased"/>
                                            </option>
                                            <option value="supported"
                                                    <c:if test="${authorNameDisplayedAs eq 'supported'}">selected</c:if>>
                                                <fmt:message key="jnt_forgeEntry.status.supported"/>
                                            </option>

                                        </select>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label for="Category"
                                           class="control-label col-sm-2">Category</label>
                                    <div class="col-sm-10">
                                        <select class="form-control"
                                                name="j:defaultCategory" id="category">
                                            <c:forEach
                                                    items="${jcr:getChildrenOfType(renderContext.site.properties.rootCategory.node,'jnt:category')}"
                                                    var="cat">
                                                <option value="${cat.identifier}"
                                                        <c:if test="${not empty category and category.string eq cat.identifier}">selected</c:if>>${cat.displayableName}</option>
                                            </c:forEach>
                                        </select>
                                    </div>
                                </div>
                                <div class="hidden-tag-item">
                                    <c:forEach items="${currentNode.properties['j:tagList']}" var="tag">
                                        <input type="hidden" name="j:tagList" value="${fn:toLowerCase(tag.string)}">
                                    </c:forEach>
                                </div>
                                <div class="form-group">
                                    <label class="control-label col-sm-2">Tags</label>
                                    <c:choose>
                                        <c:when test="${functions:length(currentNode.properties['j:tagList']) gt 0}">
                                            <c:forEach items="${currentNode.properties['j:tagList']}" var="tag"
                                                       varStatus="tagStatus">
                                                <c:if test="${(tagStatus.index mod 5) == 0}">
                                                    <div class="col-sm-3">
                                                    <ul class="list-group" <c:if
                                                        test="${(tagStatus.index mod 5) == 0}">id="tagsList${functions:round(tagStatus.index/5)}"</c:if>>
                                                </c:if>
                                                <li class="list-group-item tag-item"> ${fn:toUpperCase(tag.string)}</li>
                                                <c:if test="${(tagStatus.index mod 5) == 4 or tagStatus.last}">
                                                    </ul>
                                                    </div>
                                                </c:if>
                                            </c:forEach>
                                        </c:when>
                                        <c:otherwise>
                                            <div class="col-sm-3">
                                                <ul class="list-group" id="tagsList0"></ul>
                                            </div>
                                            <div class="col-sm-3">
                                                <ul class="list-group" id="tagsList1"></ul>
                                            </div>
                                            <div class="col-sm-3">
                                                <ul class="list-group" id="tagsList2"></ul>
                                            </div>
                                        </c:otherwise>
                                    </c:choose>

                                </div>
                                <div class="form-group">
                                    <div class="col-sm-3 col-sm-offset-2">
                                        <div class="input-group">
                                            <input type="text" id="newTag" class="form-control"/>
                                            <div class="input-group-addon"><span><i
                                                    class="material-icons text-success"
                                                    style="font-size: 18px;cursor: pointer" onclick="addTag();">add_circle_outline</i></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" class="btn btn-warning">Save Metadata</button>
                            </form>
                        </div>
                        <div role="tabpanel" class="tab-pane active" id="versions">
                            <div class="row">
                                <div class="col-md-12" style="margin-top: 15px">
                                    <template:module node="${currentNode}" view="changeLogv3-edit"/>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>