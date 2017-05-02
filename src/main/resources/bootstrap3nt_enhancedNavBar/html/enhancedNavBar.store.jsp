<%@ taglib prefix="functions" uri="http://www.jahia.org/tags/functions" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<c:set var="isHomePage" value="${renderContext.mainResource.node.identifier eq renderContext.site.home.identifier}"/>
<c:set var="isSearchResultPage" value="${(renderContext.mainResource.node.primaryNodeType.name eq 'jnt:page') and (renderContext.mainResource.node.name eq 'search-results')}"/>
<c:set value="${renderContext.site.properties['j:title'].string}" var="title"/>
<c:choose>
    <c:when test="${renderContext.editModeConfigName eq 'studiomode'}">
        <ul>
            <c:forEach items="${jcr:getChildrenOfType(currentNode, 'bootstrap3mix:navBarItem')}" var="child"
                       varStatus="status">
                <template:module node="${child}"/>
            </c:forEach>
            <template:module path="*"/>
        </ul>
    </c:when>
    <c:otherwise>
        <nav class="navbar navbar-default">
        <div class="container${currentNode.properties.fluid.boolean ? '-fluid' : ''} ${' '} hidden-print">
                <div class="navbar-header navbar-default navbar-bootsnipp animate">
                    <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#appstore-main-navbar-collapse_${currentNode.identifier}">
                        <span class="sr-only">Toggle navigation</span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>
                    <div class="role">
                        <a class="navbar-brand" href="${renderContext.site.home.url}">
                            <img src="<c:url value='${url.currentModule}/img/appstore_logo85a4b.png' />" alt="" />
                        </a>
                    </div>
                </div>
                <div class="collapse navbar-collapse" id="appstore-main-navbar-collapse_${currentNode.identifier}">
                        <ul class="nav nav-pills pull-right">
                            <%--@TODO see how we can integrate the below link as apart of the nav bar (it is seen when we go to preview a module)--%>
                            <%--<c:if test="${!(isHomePage or isSearchResultPage)}">--%>
                                <%--<ul class="nav nav-pills pull-left">--%>
                                    <%--<li>--%>
                                        <%--<a class="back-link" href="${renderContext.site.home.url}">--%>
                                            <%--<img src="<c:url value='${url.currentModule}/img/ic_arrow_back_white_36px.svg'/>">--%>
                                            <%--<span class="page-title">${renderContext.site.displayableName}</span>--%>
                                        <%--</a>--%>
                                    <%--</li>--%>
                                <%--</ul>--%>
                                    <%--</c:if>--%>
                            <c:forEach items="${jcr:getChildrenOfType(currentNode, 'bootstrap3mix:navBarItem')}" var="child"
                                       varStatus="status">
                                <template:module node="${child}"/>
                            </c:forEach>
                        </ul>
                </div>
        </div>
        </nav>
        <h3 class="text-muted"><c:if test="${not empty title}">${title}</c:if></h3>
    </c:otherwise>
</c:choose>