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
    })
</script>

<div class="container" style="margin-top: 50px;">
    <div class="row">
        <div class="col-md-2">
            <div class="row">
                <div class="col-md-12">
                    <img class="moduleImage" src="${not empty icon.url ? icon.url : iconUrl}"
                         alt="<fmt:message key="jnt_forgeEntry.label.moduleIcon"><fmt:param value="${title}"/></fmt:message>"
                         style="display:block;"/>
                    <div class="clearfix"></div>
                </div>
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
                                        value="${moduleMap.latestVersion.properties['jcr:lastModified'].date.time}"
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
            </div>
        </div>
        <div class="col-md-9">
            <h2>${title}
                <c:choose>
                    <c:when test="${moduleStatus eq 'supported'}">
                            <span class="module-supported">
                                <i class="material-icons noselect" title="${moduleStatus}">check_circle</i>
                            </span>
                    </c:when>
                </c:choose>
            </h2>
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
                            <a class="btn btn-default module-download-btn pull-right"
                               href="<c:url value="${moduleMap.latestVersion.properties.url.string}"/>">
                                Download (${versionNumber.string})
                            </a>
                            <c:if test="${not empty previousVersions}">
                                <div class="meta-info align-right">
                                    <a class="modal-link-text" data-toggle="modal" data-target="#changeLogModal"
                                       href="#">
                                        <fmt:message key="jnt_forgemodule.clickToBrowse"/>
                                    </a>
                                </div>
                            </c:if>
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
                        <p><a class="btn btn-default module-download-btn" href="${editModule}" target="_blank">Open in
                            repository explorer</a></p>
                    </c:if>
                    <c:if test="${isDeveloper}">
                        <c:url value="${url.base}${currentNode.path}.store-module-v2-edit.html" var="editModule"/>
                        <p><a class="btn btn-default module-download-btn" href="${editModule}" target="_self">Edit
                            Module</a></p>
                    </c:if>
                    ${description}
                </div>
            </div>
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
                                        <li class="list-group-item"><a
                                                href="<c:url value="${linkedModule.url}" context="/"/>">${functions:abbreviate(module.properties.moduleName.string,60,70,'...')}</a>
                                            <span class="pull-right">${module.properties.moduleVersion.string}</span>
                                        </li>
                                    </c:forEach>
                                </c:forEach>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
            <%--How to Install--%>
            <c:if test="${not empty howToInstall}">
                <div class="row">
                    <div class="col-md-12 module-section-title">

                        <h2>How To Install</h2>
                        <span></span>

                        <div id="installText">
                                ${howToInstall}
                        </div>
                    </div>
                    <div class="col-md-6 col-md-offset-4" id="installReadMoreButton" style="display: none">
                        <a class="modal-link-text" onclick="showReadMore('installText',this);">Read More...</a>
                    </div>
                </div>
            </c:if>
            <%--Changelog--%>
            <c:if test="${not empty moduleMap.latestVersion.properties.changeLog.string}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>Changelog ${versionNumber.string}</h2>
                        <span></span>

                        <div id="changeLogText">
                                ${moduleMap.latestVersion.properties.changeLog.string}
                        </div>
                    </div>
                    <div class="col-md-6 col-md-offset-4" id="changeLogReadMoreButton" style="display: none">
                        <a class="modal-link-text" onclick="showReadMore('changeLogText',this);">Read More...</a>
                    </div>
                </div>
            </c:if>
            <%--IMAGES--%>
            <c:if test="${not empty jcr:getChildrenOfType(screenshots,'jnt:file')}">
                <div class="row">
                    <div class="col-md-12 module-section-title">
                        <h2>Images</h2>
                        <span></span>
                        <template:module node="${screenshots}" view="v3">
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
                        <template:module path="${videoNode.path}" view="lightbox"/>
                    </div>
                </div>
            </c:if>
        </div>
        <div class="col-md-1"></div>
    </div>
</div>