<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
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
<c:set var="isAdminPage" value="${renderContext.mainResource.resolvedTemplate eq 'my-modules'}"/>
<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<jcr:node var="iconFolder" path="${currentNode.path}/icon" />
<c:forEach var="iconItem" items="${iconFolder.nodes}">
    <c:set var="icon" value="${iconItem}"/>
</c:forEach>
<c:set var="description" value="${currentNode.properties['description'].string}"/>

<%@include file="../../commons/authorName.jspf"%>

<c:url value="${currentNode.url}" context="/" var="moduleUrl"/>

<fmt:message key="jnt_forgeEntry.status.community" var="communityLabel"/>
<fmt:message key="jnt_forgeEntry.status.labs" var="labsLabel"/>
<fmt:message key="jnt_forgeEntry.status.prereleased" var="prereleasedLabel"/>
<fmt:message key="jnt_forgeEntry.status.supported" var="supportedLabel"/>
<fmt:message key="jnt_forgeEntry.status.legacy" var="legacyLabel"/>
<c:set var="published" value="${currentNode.properties['published'].boolean}"/>
<c:if test="${currentNode.properties['published'].boolean or isAdminPage}">
    <!-- Module Card -->
    <a href="${moduleUrl}">
        <div class="jps-moduleCard">
            <c:url var="iconUrl" value="${url.currentModule}/img/icon.png"/>
            <img class="moduleLogo noselect" src="${not empty icon.url ? icon.url : iconUrl}" alt="<fmt:message key="jnt_forgeEntry.label.moduleIcon"><fmt:param value="${title}"/></fmt:message>"/>
            <div class="card-topMain">
                <c:choose>
                    <c:when test="${not empty currentResource.moduleParams.showColorTitle}">
                        <h1 class="truncate <c:choose><c:when test="${published}">text-success</c:when><c:otherwise>text-danger</c:otherwise></c:choose>">${title}</h1>
                    </c:when>
                    <c:otherwise>
                        <h1 class="truncate">${title}</h1>
                    </c:otherwise>
                </c:choose>

                <author>${authorName}
                    <c:if test="${not empty currentNode.properties['status'].string}">
                        <span class="module-badge-16 module-${currentNode.properties['status'].string}">
                            <i class="material-icons noselect" title="<c:choose>
                                   <c:when test="${currentNode.properties['status'].string eq 'supported'}">
                                       <fmt:message key="jnt_forgeEntry.status.supported"/>: <fmt:message key="jnt_forgeEntry.status.supported.explanation"/>
                                   </c:when>
                                   <c:when test="${currentNode.properties['status'].string eq 'community'}">
                                       <fmt:message key="jnt_forgeEntry.status.community"/>: <fmt:message key="jnt_forgeEntry.status.community.explanation"/>
                                   </c:when>
                                   <c:when test="${currentNode.properties['status'].string eq 'prereleased'}">
                                       <fmt:message key="jnt_forgeEntry.status.prereleased"/>: <fmt:message key="jnt_forgeEntry.status.prereleased.explanation"/>
                                   </c:when>
                                   <c:when test="${currentNode.properties['status'].string eq 'labs'}">
                                       <fmt:message key="jnt_forgeEntry.status.labs"/>: <fmt:message key="jnt_forgeEntry.status.labs.explanation"/>
                                   </c:when>
                                   <c:when test="${currentNode.properties['status'].string eq 'legacy'}">
                                       <fmt:message key="jnt_forgeEntry.status.legacy"/>: <fmt:message key="jnt_forgeEntry.status.legacy.explanation"/>
                                   </c:when>
                               </c:choose>">
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
                                    <c:when test="${currentNode.properties['status'].string eq 'legacy'}">
                                        elderly
                                    </c:when>
                                </c:choose>
                            </i>
                        </span>
                    </c:if>
                </author>
            </div>
            <p class="card-desc">${functions:abbreviate(functions:removeHtmlTags(description), 80,95,'...')}</p>
        </div>
    </a>
</c:if>
