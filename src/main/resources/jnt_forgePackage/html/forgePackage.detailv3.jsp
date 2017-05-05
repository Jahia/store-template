<%@ page import="java.util.Calendar" %>
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

<%@include file="../../commons/authorName.jspf"%>

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

<jcr:nodeProperty node="${moduleMap.latestVersion}" name="versionNumber" var="versionNumber"/>
<jcr:nodeProperty node="${currentNode}" name="j:tagList" var="assignedTags"/>

<c:forEach items="${currentNode.properties['j:defaultCategory']}" var="cat" varStatus="vs">
    <c:set var="category" value="${cat}"/>
</c:forEach>

<%--Icon url--%>
<c:url var="iconUrl" value="${url.currentModule}/img/icon.png"/>
<jcr:node var="iconFolder" path="${currentNode.path}/icon"/>
<c:forEach var="iconItem" items="${iconFolder.nodes}">
    <c:set var="icon" value="${iconItem}"/>
</c:forEach>

<div class="container" style="margin-top: 50px;">
    <div class="row">
        <div class="col-md-2">
            <img class="moduleImage" src="${not empty icon.url ? icon.url : iconUrl}"
                 alt="<fmt:message key="jnt_forgeEntry.label.moduleIcon"><fmt:param value="${title}"/></fmt:message>"
                 style="display:block;"/>
            <div class="clearfix"></div>
        </div>
        <div class="col-md-9">
            <h2>${title}</h2>
            <%--TAGS AND DOWNLOAD--%>
            <div class="row">
                <div class="col-sm-10">
                    <c:forEach items="${assignedTags}" var="tag" varStatus="status">
                        <tag class="module-tag">${fn:escapeXml(tag.string)}</tag>
                    </c:forEach>
                </div>
                <div class="col-sm-2">
                    <a class="btn btn-default module-download-btn"
                       href="<c:url value="${moduleMap.latestVersion.properties.url.string}"/>">
                        <%--<fmt:message key="jnt_forgeEntry.label.downloadCurrentVersion">--%>
                        <%--<fmt:param value="${versionNumber.string}"/>--%>
                        <%--</fmt:message>--%>
                        Download
                    </a>
                </div>
            </div>
            <%--DESCRIPTION--%>
            <div class="row" style="margin-top: 20px;">
                <div class="col-md-12">
                    ${description}
                </div>
            </div>
            <%--MODULE DETAILS--%>
            <div class="row">
                <div class="col-md-12 module-section-title">
                    <h2>Module Details</h2>
                    <span></span>
                    <div class="more-info-container.disabled">
                        <div class="meta-info">
                            <div class="title">
                                <fmt:message key="jnt_forgeEntry.label.moduleId"/>
                            </div>
                            <div class="content">
                                ${currentNode.name}
                            </div>
                        </div>

                        <div class="meta-info">
                            <div class="title">
                                <fmt:message key="jnt_forgeEntry.label.groupId"/>
                            </div>
                            <div class="content">
                                ${currentNode.properties['groupId'].string}
                            </div>
                        </div>

                        <div class="meta-info">
                            <div class="title">
                                <fmt:message key="jnt_forgeEntry.label.updated" var="updatedLabel"/>
                                ${fn:replace(updatedLabel,':','')}
                            </div>
                            <div class="content">
                                <%--${latestVersion.properties['jcr:lastModified'].date.time}--%>
                                <time itemprop="datePublished">
                                    <fmt:formatDate value="${moduleMap.latestVersion.properties['jcr:lastModified'].date.time}"
                                                    pattern="yyyy-MM-dd"/>
                                </time>
                            </div>
                        </div>

                        <div class="meta-info">
                            <div class="title">
                                <fmt:message key="jnt_forgeEntry.label.version" var="versionLabel"/>
                                ${fn:replace(versionLabel,':','')}
                            </div>
                            <div class="content">
                                <c:if test="${not empty versionNumber.string}">
                                    ${versionNumber.string}<br/>
                                </c:if>
                                <%--TODO--%>
                                <a class="modal-link-text" data-toggle="modal" data-target="#changeLogModal" href="#">
                                    <fmt:message key="jnt_forgemodule.clickToBrowse"/>
                                </a>
                            </div>
                            <div id="changeLogModal" class="modal fade" role="dialog" tabindex="-1">
                                <div class="modal-dialog changeLogDialog">
                                    <div class="modal-header">
                                        <button type="button" class="close pull-right"
                                                data-dismiss="modal">&times;</button>
                                        <h2><fmt:message key="jnt_forgeEntry.versions"/></h2>
                                    </div>
                                    <div class="modal-content">
                                        <iframe src="${fn:replace(currentNode.url,".html",".changelog2.html")}"></iframe>
                                        <%--<template:include view="changeLogv2"/>--%>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="meta-info">
                            <div class="title">
                                <fmt:message key="jnt_forgeEntry.label.relatedJahiaVersion" var="JahiaVersionLabel"/>
                                ${fn:replace(JahiaVersionLabel,':','')}
                            </div>
                            <div class="content">
                                ${fn:replace(moduleMap.latestVersion.properties['requiredVersion'].node.displayableName,'version-','')}<br/>
                            </div>
                        </div>

                        <div class="meta-info">
                            <div class="title">
                                <fmt:message key="jnt_forgeEntry.label.authorName" var="authorLabel"/>
                                ${fn:replace(authorLabel,':','')}
                            </div>
                            <div class="content">
                                ${authorName}
                            </div>
                        </div>

                        <div class="meta-info">
                            <div class="title">
                                <fmt:message key="jnt_forgeEntry.label.category"/>
                            </div>
                            <div class="content">
                                ${category.node.displayableName}
                            </div>
                        </div>

                        <div class="meta-info large">
                            <c:if test="${not empty authorURL}">
                                <a class="link" target="_blank" href="${authorURL}">
                                    <fmt:message key="jnt_forgeEntry.label.authorURL"/>
                                </a>
                            </c:if>
                            <div class="developperEmail">
                                <c:if test="${not empty authorEmail}">
                                    <a class="link_text"
                                       href="mailto:${authorEmail}?Subject=${fn:replace(title, " ","%20")}%20-%20Version:%20${versionNumber.string}"><fmt:message
                                            key="jnt_forgeEntry.label.authorEmail"/></a>
                                </c:if>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
            <%--HOW TO INSTALL--%>
            <div class="row">
                <div class="col-md-12 module-section-title">
                    <c:if test="${not empty howToInstall}">
                        <h2>How To Install</h2>
                        <span></span>
                    </c:if>
                    ${howToInstall}
                </div>
            </div>
        </div>
        <div class="col-md-1"></div>
    </div>
</div>