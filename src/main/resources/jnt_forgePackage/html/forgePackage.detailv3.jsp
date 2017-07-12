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
<template:addResources type="javascript" resources="libraries/photoswipe/photoswipe.js"/>
<template:addResources type="javascript" resources="libraries/photoswipe/photoswipe-ui-defaults.js"/>
<template:addResources type="javascript" resources="libraries/photoswipe/initialize.js"/>
<template:addResources type="css" resources="libraries/photoswipe/photoswipe.css"/>
<template:addResources type="css" resources="libraries/photoswipe/default-skin/default-skin.css"/>
<template:addResources type="css" resources="libraries/photoswipe/gallerycss.css"/>

<%@include file="../../commons/authorName.jspf" %>

<jcr:sql
        var="query"
        sql="SELECT * FROM [jnt:forgePackageVersion] AS packageVersion
            WHERE isdescendantnode(packageVersion,['${currentNode.path}'])"
/>
<c:set var="isDeveloper" value="${jcr:hasPermission(currentNode, 'jcr:write')}"/>
<c:set var="hasRepositoryAccess" value="${jcr:hasPermission(currentNode, 'repositoryExplorer')}"/>
<c:set var="sortedModules" value="${forge:sortByVersion(query.nodes)}"/>
<c:set target="${moduleMap}" property="latestVersion" value="${forge:latestVersion(sortedModules)}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<c:set var="description" value="${currentNode.properties['description'].string}"/>
<c:set var="howToInstall" value="${currentNode.properties['howToInstall'].string}"/>
<c:set var="authorURL" value="${currentNode.properties['authorURL'].string}"/>
<c:set var="authorEmail" value="${currentNode.properties['authorEmail'].string}"/>

<c:set var="FAQ" value="${currentNode.properties['FAQ'].string}"/>
<c:set var="license" value="${currentNode.properties['license'].string}"/>

<c:set var="hasVideoNode" value="${jcr:hasChildrenOfType(currentNode, 'jnt:videostreaming')}"/>
<c:if test="${hasVideoNode}">
    <jcr:node var="videoNode" path="${currentNode.path}/video"/>
    <c:set var="videoProvider" value="${videoNode.properties['provider'].string}"/>
    <c:set var="videoIdentifier" value="${videoNode.properties['identifier'].string}"/>
    <c:set var="videoHeight" value="${videoNode.properties['height'].string}"/>
    <c:set var="videoWidth" value="${videoNode.properties['width'].string}"/>
    <c:set var="videoAllowfullscreen" value="${videoNode.properties['allowfullscreen'].string}"/>
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

<template:include view="hidden.sql">
    <template:param name="getLatestVersion" value="true"/>
    <template:param name="getPreviousVersions" value="true"/>
</template:include>
<c:set value="${moduleMap.latestVersion}" var="latestVersion"/>
<c:set value="${moduleMap.previousVersions}" var="previousVersions"/>
<c:set value="${moduleMap.nextVersions}" var="nextVersions"/>

<script>
    function showReadMore(id, button) {
        var contentDiv = $('#' + id);
        if (contentDiv.hasClass('read-more')) {
            contentDiv.removeClass('read-more');
            $(button).html('Read Less...');
        } else {
            contentDiv.addClass('read-more');
            $(button).html('Read More...');
        }
    }
    $(document).ready(function () {
        var $installText = $("#installText");
        if ($installText.innerHeight() > 200) {
            $installText.addClass('read-more');
            $("#installReadMoreButton").show();
        }
        var $changeLogText = $("#changeLogText");
        if ($changeLogText.innerHeight() > 200) {
            $changeLogText.addClass('read-more');
            $("#changeLogReadMoreButton").show();
        }

        var $faqText = $("#faqText");
        if ($faqText.innerHeight() > 200) {
            $faqText.addClass('read-more');
            $("#faqReadMoreButton").show();
        }

        var $licenseText = $("#licenseText");
        if ($licenseText.innerHeight() > 200) {
            $licenseText.addClass('read-more');
            $("#licenseReadMoreButton").show();
        }
    })
</script>

<div class="container" style="<c:if test="${empty param.dx}">margin-top: 50px;</c:if> min-height:calc(100vh - 280px);">
    <div class="row">
        <div class="col-md-2">
            <div class="row">
                <div class="col-md-12">
                    <img class="moduleImage" src="${not empty icon.url ? icon.url : iconUrl}"
                         alt="<fmt:message key="jnt_forgeEntry.label.moduleIcon"><fmt:param value="${title}"/></fmt:message>"
                         style="display:block;"/>
                    <div class="clearfix"></div>
                </div>
                <c:if test="${empty param.dx}">
                <%--MODULE DETAILS--%>
                <div class="col-md-12">
                    <div class="meta-info">
                        <div class="module-details-title">
                            <fmt:message key="jnt_forgeEntry.label.moduleId"/>
                        </div>
                        <div class="module-details-content">
                            ${currentNode.name}
                        </div>
                    </div>
                </div>
                <div class="col-md-12">
                    <div class="meta-info">
                        <div class="module-details-title">
                            <fmt:message key="jnt_forgeEntry.label.authorName" var="authorLabel"/>
                            ${fn:replace(authorLabel,':','')}
                        </div>
                        <div class="module-details-content">
                            ${authorName}
                        </div>
                    </div>
                </div>
                <div class="col-md-12">
                    <div class="meta-info">
                        <div class="module-details-title">
                            <fmt:message key="jnt_forgeEntry.label.updated" var="updatedLabel"/>
                            ${fn:replace(updatedLabel,':','')}
                        </div>
                        <div class="module-details-content">
                            <%--${latestVersion.properties['jcr:lastModified'].date.time}--%>
                            <time itemprop="datePublished">
                                <fmt:formatDate
                                        value="${moduleMap.latestVersion.properties['jcr:created'].date.time}"
                                        pattern="yyyy-MM-dd"/>
                            </time>
                        </div>
                    </div>
                </div>
                <div class="col-md-12">
                    <div class="meta-info">
                        <div class="module-details-title">
                            <fmt:message key="jnt_forgeEntry.label.relatedJahiaVersion" var="JahiaVersionLabel"/>
                            ${fn:replace(JahiaVersionLabel,':','')}
                        </div>
                        <div class="module-details-content">
                            ${fn:replace(moduleMap.latestVersion.properties['requiredVersion'].node.displayableName,'version-','')}<br/>
                        </div>
                    </div>
                </div>
                <div class="col-md-12">
                    <div class="meta-info">
                        <div class="module-details-title">
                            <fmt:message key="jnt_forgeEntry.label.category"/>
                        </div>
                        <div class="module-details-content">
                            ${category.node.displayableName}
                        </div>
                    </div>
                </div>

                <div class="col-md-12">
                    <div class="meta-info">
                        <div class="module-details-title">
                            <fmt:message key="jnt_forgeModuleVersion.status"/>
                        </div>
                        <div class="module-details-content">
                            ${fn:toUpperCase(currentNode.properties['status'].string)}
                        </div>
                    </div>
                </div>

                <div class="col-md-12">
                    <div class="meta-info large">
                        <c:if test="${not empty authorURL}">
                            <a class="module-details-link" target="_blank" href="${authorURL}">
                                <fmt:message key="jnt_forgeEntry.label.authorURL"/>
                            </a>
                        </c:if>
                        <div class="developperEmail">
                            <c:if test="${not empty authorEmail}">
                                <a class="module-details-link"
                                   href="mailto:${authorEmail}?Subject=${fn:replace(title, " ","%20")}%20-%20Version:%20${versionNumber.string}"><fmt:message
                                        key="jnt_forgeEntry.label.authorEmail"/></a>
                            </c:if>
                        </div>
                    </div>
                </div>
                </c:if>
            </div>
        </div>
        <div class="col-md-9">
            <div class="row">
                <div class="col-md-10">
                    <h2>${title}
                        <c:if test="${not empty currentNode.properties['status'].string}">
                            <span class="module-badge-24 module-${currentNode.properties['status'].string}"
                                  style="vertical-align: middle">
                                <i class="material-icons noselect" title="${currentNode.properties['status'].string}">
                                    <c:choose>
                                        <c:when test="${currentNode.properties['status'].string eq 'supported'}">
                                            check_circle
                                        </c:when>
                                        <c:when test="${currentNode.properties['status'].string eq 'community'}">
                                            group_work
                                        </c:when>
                                        <c:when test="${currentNode.properties['status'].string eq 'prereleased'}">
                                            offline_pin
                                        </c:when>
                                        <c:when test="${currentNode.properties['status'].string eq 'labs'}">
                                            bug_report
                                        </c:when>
                                    </c:choose>
                                </i>
                            </span>
                        </c:if>
                    </h2>
                </div>
            </div>
            <%--TAGS AND DOWNLOAD--%>
            <div class="row padding-bottom-10">
                <div class="col-sm-9 bottom-20">
                    <c:forEach items="${assignedTags}" var="tag" varStatus="status">
                        <tag class="module-tag">${fn:escapeXml(tag.string)}</tag>
                    </c:forEach>
                </div>
                <div class="col-sm-3">
                    <div class="row">
                        <div class="col-sm-12">
                            <c:choose>
                                <c:when test="${moduleMap.latestVersion.properties['published'].boolean}">
                                    <%--There is just one child here so will only display one button--%>
                                    <c:set var="versionFile" value="${jcr:getChildrenOfType(moduleMap.latestVersion, 'jnt:file')}"/>
                                    <c:forEach items="${versionFile}" var="file" varStatus="status">
                                        <a class="btn btn-default module-download-btn pull-right"
                                           href="<c:url value="${url.context}${url.files}${file.path}" context="/"/>">
                                            Download (${versionNumber.string})
                                        </a>
                                    </c:forEach>
                                    <c:if test="${not empty previousVersions}">
                                        <div class="meta-info align-right">
                                            <a class="modal-link-text" data-toggle="modal" data-target="#changeLogModal"
                                               href="#">
                                                <fmt:message key="jnt_forgemodule.clickToBrowse"/>
                                            </a>
                                        </div>
                                    </c:if>
                                </c:when>
                                <c:otherwise>
                                    <div class="alert alert-warning download-unavailable" role="alert">
                                        <span class=""><fmt:message key="jnt_forgemodule.noDownloadableVersionAvailable"/></span>
                                    </div>
                                </c:otherwise>
                            </c:choose>
                        </div>
                    </div>
                </div>
                <c:if test="${not empty previousVersions}">
                    <!-- ** Start CHANGE LOG MODAL -->
                    <div id="changeLogModal" class="modal fade" role="dialog" tabindex="-1">
                        <div class="modal-dialog changeLogDialog">
                            <div class="modal-header">
                                <button type="button" class="close pull-right"
                                        data-dismiss="modal">&times;</button>
                                <h2><fmt:message key="jnt_forgeEntry.versions"/></h2>
                            </div>
                            <div class="modal-content">
                                <template:module node="${currentNode}" view="changeLogv3"/>
                            </div>
                        </div>
                    </div>
                    <!-- ** End CHANGE LOG MODAL -->
                </c:if>
            </div>
            <%--DESCRIPTION--%>
            <div class="row" style="margin-top: 20px;">
                <div class="col-md-12">
                        <c:if test="${hasRepositoryAccess}">
                            <c:url value="/engines/manager.jsp" var="editModule">
                                <c:param name="selectedPaths" value="${currentNode.path}"/>
                                <c:param name="workspace" value="live"/>
                            </c:url>
                            <a class="btn btn-link" href="${editModule}" target="_blank" title="Open in repository explorer"><i class="material-icons jahia-color">explore</i></a>
                        </c:if>

                        <c:if test="${isDeveloper}">
                            <c:url value="${url.base}${currentNode.path}.store-module-v2-edit.html" var="editModule"/>
                            <a class="btn btn-link" href="${editModule}" target="_self" title="Edit"><i class="material-icons jahia-color">mode_edit</i> </a>
                        </c:if>
                </div>
                <div class="col-md-12">
                    ${description}
                </div>
            </div>
            <%--DEPENDENCIES--%>
            <div class="row">
                <div class="col-md-12 module-section-title">
                    <h2>Embedded Modules</h2>
                    <span></span>
                </div>
            </div>
            <div class="row">
                <div class="col-md-10 col-md-offset-1" style="max-height: 250px;overflow-y: auto">
                    <div class="meta-info">
                        <div class="title">
                            Modules
                        </div>
                        <div class="content">
                            <ul class="list-group">
                                <jcr:node var="modulesList" path="${moduleMap.latestVersion.path}/modulesList"/>
                                <c:forEach items="${jcr:getChildrenOfType(modulesList,'jnt:forgePackageModule')}"
                                           var="module">
                                    <jcr:sql var="appStoreModule" sql="SELECT * FROM [jnt:content]
                WHERE ISDESCENDANTNODE('${renderContext.site.path}') AND [published]=true
                AND ([jcr:primaryType] = 'jnt:forgeModule') and localName() = '${module.name}'
                ORDER BY [jcr:title] ASC"/>
                                    <c:forEach items="${appStoreModule.nodes}" var="linkedModule">
                                        <c:choose>
                                            <c:when test="${empty param.dx}">
                                                <c:url value="${linkedModule.url}" context="/" var="moduleURL"/>
                                            </c:when>
                                            <c:otherwise>
                                                <c:url value="${linkedModule.url}" context="/" var="moduleURL">
                                                    <c:param name="dx" value="true"/>
                                                </c:url>
                                            </c:otherwise>
                                        </c:choose>
                                        <li class="list-group-item"><a
                                                href="${moduleURL}">${functions:abbreviate(module.properties.moduleName.string,60,70,'...')}</a>
                                            <span class="pull-right">${module.properties.moduleVersion.string}</span>
                                        </li>
                                    </c:forEach>
                                </c:forEach>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <%--Changelog--%>
            <c:if test="${not (fn:length(fn:trim(moduleMap.latestVersion.properties.changeLog.string)) eq 0)}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>Changelog ${versionNumber.string}</h2>
                        <span></span>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div id="changeLogText">
                                ${moduleMap.latestVersion.properties.changeLog.string}
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 col-md-offset-4" id="changeLogReadMoreButton" style="display: none">
                        <a class="modal-link-text" onclick="showReadMore('changeLogText',this);">Read More...</a>
                    </div>
                </div>
            </c:if>
            <%--FAQ--%>
            <c:if test="${not (fn:length(fn:trim(FAQ)) eq 0)}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>FAQ</h2>
                        <span></span>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div id="faqText">
                                ${FAQ}
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 col-md-offset-4" id="faqReadMoreButton" style="display: none">
                        <a class="modal-link-text" onclick="showReadMore('faqText',this);">Read More...</a>
                    </div>
                </div>
            </c:if>
            <%--How to Install--%>
            <c:if test="${not (fn:length(fn:trim(howToInstall)) eq 0)}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>How To Install</h2>
                        <span></span>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div id="installText">
                                ${howToInstall}
                        </div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-6 col-md-offset-4" id="installReadMoreButton" style="display: none">
                        <a class="modal-link-text" onclick="showReadMore('installText',this);">Read More...</a>
                    </div>
                </div>
            </c:if>
            <%--IMAGES--%>
            <c:if test="${not empty jcr:getChildrenOfType(screenshots,'jnt:file')}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>Images</h2>
                        <span></span>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <template:module node="${screenshots}" view="photoswipe">
                            <template:param name="id" value="${currentNode.identifier}"/>
                        </template:module>
                    </div>
                </div>
            </c:if>
            <%--VIDEO--%>
            <c:if test="${hasVideoNode}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>Video</h2>
                        <span></span>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <template:module path="${videoNode.path}" view="lightbox"/>
                    </div>
                </div>
            </c:if>
            <%--LICENSE--%>
            <c:if test="${not (fn:length(fn:trim(license)) eq 0)}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>License</h2>
                        <span></span>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-12">
                        <div id="licenseText">
                                ${license}
                        </div>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-6 col-md-offset-4" id="licenseReadMoreButton" style="display: none">
                        <a class="modal-link-text" onclick="showReadMore('licenseText',this);">Read More...</a>
                    </div>
                </div>
            </c:if>
        </div>
        <div class="col-md-1"></div>
    </div>
</div>