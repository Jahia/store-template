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
        <nav class="navbar navbar-fixed-top hidden-print headroom headroom--not-bottom headroom--pinned headroom--top">
            <div class="container hidden-print">

                <!-- Brand and toggle get grouped for better mobile display -->
                <div class="navbar-header">

                    <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#appstore-navbar-collapse-${currentNode.identifier}" aria-expanded="false">
                        <span class="sr-only">Toggle navigation</span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                        <span class="icon-bar"></span>
                    </button>

                        <%--${renderContext.site.home.url}--%>
                    <a class="navbar-brand" href="${renderContext.site.path}/home.html">
                        <img class="logo" src="<c:url value='${url.currentModule}/img/appstore_logo85a4b.png' />" alt="Logo">
                    </a>
                </div>

                <!-- Collect the nav links, forms, and other content for toggling -->
                <div class="collapse navbar-collapse" id="appstore-navbar-collapse-${currentNode.identifier}">
                    <ul class="nav navbar-nav navbar-right">
                        <c:forEach items="${jcr:getChildrenOfType(currentNode, 'bootstrap3mix:navBarItem')}" var="child"
                                   varStatus="status">
                            <template:module node="${child}"/>
                        </c:forEach>
                    </ul>
                </div>
            </div>

            <!-- Remove is search bar is not needed (eg: module details). -->
            <search class="search-bar">
                <div class="container hidden-print">
                    <form class="navbar-form navbar-search navbar-left" >
                        <div class="form-group">
                            <div class="input-group">
                                <span class="input-group-addon" id="basic-addon1"><i class="material-icons">search</i></span>
                                <input type="text" class="form-control" placeholder="Search">
                            </div>
                        </div>
                    </form>
                    <ul class="nav navbar-nav navbar-right">
                        <button type="button" class="btn btn-default btn-tagsmodal" data-toggle="modal" data-target="#myModal">Tags</button>
                        <li class="dropdown">
                            <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">Categories <span class="caret"></span></a>
                            <ul class="dropdown-menu">
                                <li><a href="#">1</a></li>
                                <li><a href="#">2</a></li>
                                <li><a href="#">3</a></li>
                            </ul>
                        </li>
                    </ul>
                </div>
            </search>
        </nav>


        <!-- Modal -->
        <div class="modal fade tag-modal" id="myModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <input type="text" class="form-control" id="usr" placeholder="Filter tags">
                    </div>
                    <div class="modal-body">
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 1</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 2</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 3</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 4</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 5</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 6</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 7</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 8</label></div>
                        <div class="tag-selector"><label><input type="checkbox" name="checkbox" value="value" class="fs1">Tag 9</label></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-aply-filter">Apply filter</button>
                    </div>
                </div>
            </div>
        </div>
        <h3 class="text-muted"><c:if test="${not empty title}">${title}</c:if></h3>
    </c:otherwise>
</c:choose>