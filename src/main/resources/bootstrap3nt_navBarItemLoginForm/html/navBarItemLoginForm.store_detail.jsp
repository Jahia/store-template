<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="ui" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>
<%--@elvariable id="currentAliasUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<jcr:nodeProperty node="${currentNode}" name="position" var="position"/>
<c:set var="pullClass" value="" />
<c:set var="isForgeAdmin" value="${jcr:hasPermission(renderContext.site, 'jahiaForgeModerateModule')}"/>
<c:if test="${not empty position}">
    <c:set var="pullClass" value=" navbar-${position.string}" />
</c:if>

<c:if test="${! renderContext.editMode}">
    <c:if test="${! renderContext.loggedIn}">
        <c:set var="siteNode" value="${currentNode.resolveSite}"/>
        <%--<button class="btn navbar-btn${pullClass}" type="button" data-toggle="modal" data-target="#loginForm_${currentNode.identifier}">--%>
            <%--<i class="glyphicon glyphicon-user glyphicon-white"></i>&nbsp;<fmt:message key="bootstrap3nt_navBarItemLoginForm.menu.button.title"/>--%>
        <%--</button>--%>

        <li>
            <a href="#" data-toggle="modal" data-target="#loginForm_${currentNode.identifier}">
                <fmt:message key="bootstrap3nt_navBarItemLoginForm.menu.button.title"/>
            </a>
        </li>

        <div id="loginForm_${currentNode.identifier}" class="modal fade" tabindex="-1" role="dialog" aria-labelledby="loginFormModalLabel_${currentNode.identifier}">
            <div class="modal-dialog login-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                        <h4 class="modal-title" id="loginFormModalLabel_${currentNode.identifier}"><fmt:message key="bootstrap3nt_navBarItemLoginForm.menu.button.title"/></h4>
                    </div>
                    <ui:loginArea>
                        <div class="modal-body">
                            <c:if test="${not empty param['loginError']}">
                                <div class="alert alert-danger" role="alert">
                                    <fmt:message key="${param['loginError'] == 'account_locked' ? 'message.accountLocked' : 'message.invalidUsernamePassword'}"/>
                                </div>
                            </c:if>

                            <div class="form-horizontal">
                                <div class="form-group">
                                    <label for="username" class="control-label col-sm-2">
                                        <fmt:message key="bootstrap3nt_navBarItemLoginForm.username"/>
                                    </label>

                                    <div class="col-sm-10">
                                        <input type="text" value="" id="username" name="username"
                                               class="form-control"
                                               placeholder="<fmt:message key="bootstrap3nt_navBarItemLoginForm.username"/>">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="password" class="control-label col-sm-2">
                                        <fmt:message key="bootstrap3nt_navBarItemLoginForm.password"/>
                                    </label>

                                    <div class="col-sm-10">
                                        <input type="password" name="password" id="password"
                                               class="form-control"
                                               placeholder="<fmt:message key="bootstrap3nt_navBarItemLoginForm.password"/>" autocomplete="off">
                                    </div>
                                </div>

                                <div class="form-group">
                                    <div class="col-sm-offset-2 col-sm-10">
                                        <div class="checkbox">
                                            <label for="useCookie">
                                                <input type="checkbox" id="useCookie" name="useCookie" class="fs1"/>
                                                <fmt:message key="bootstrap3nt_navBarItemLoginForm.menu.rememberMe"/>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-default" type="button" data-dismiss="modal">
                                <i class="glyphicon glyphicon-remove glyphicon-white"></i>&nbsp;<fmt:message key='bootstrap3nt_navBarItemLoginForm.menu.button.close'/>
                            </button>
                            <button class="btn btn-primary" type="submit">
                                <i class="glyphicon glyphicon-ok glyphicon-white"></i>&nbsp;<fmt:message key='bootstrap3nt_navBarItemLoginForm.menu.button.title'/>
                            </button>
                        </div>
                    </ui:loginArea>
                </div>
            </div>
        </div>

        <script type="text/javascript">
            $(document).ready(function() {
                $('body').append($('#loginForm_${currentNode.identifier}'));
                <c:set var="modalOption" value="${empty param['loginError'] ? 'hide' : 'show'}"/>
                $('#loginForm_${currentNode.identifier}').modal('${modalOption}');
            })
        </script>
    </c:if>
</c:if>
<c:if test="${renderContext.loggedIn}">
    <ul class="nav navbar-nav${pullClass}">
        <jcr:node var="userNode" path="${currentUser.localPath}" />
        <%--<jcr:nodeProperty var="picture" node="${userNode}" name="j:picture"/>--%>
        <c:set var="firstname" value="${userNode.properties['j:firstName'].string}"/>
        <c:set var="lastname" value="${userNode.properties['j:lastName'].string}"/>
        <li class="dropdown">
            <a class="dropdown-toggle detailLoginBtn btn" data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">
                <%--<c:choose>--%>
                    <%--<c:when test="${not empty picture}">--%>
                        <%--<template:addCacheDependency flushOnPathMatchingRegexp="${userNode.path}/files/profile/.*"/>--%>
                        <%--<c:url value="${picture.node.thumbnailUrls['avatar_120']}" context="/" var="pictureUrl"/>--%>
                        <%--<img class="userAvatar" src="${pictureUrl}" alt="${fn:escapeXml(firstname)} ${fn:escapeXml(lastname)}" width="16"/>--%>
                    <%--</c:when>--%>
                    <%--<c:otherwise>--%>
                        <%--<img class="userAvatar" src="<c:url value='${url.currentModule}/img/user-black.png'/>" alt="${fn:escapeXml(firstname)} ${fn:escapeXml(lastname)}" width="16"/>--%>
                    <%--</c:otherwise>--%>
                <%--</c:choose>--%>
                    ${fn:escapeXml(empty firstname and empty lastname ? userNode.name : firstname)}&nbsp;${fn:escapeXml(lastname)} <span class="caret"></span>
            </a>
            <ul class="dropdown-menu">
                <c:if test="${isForgeAdmin}">
                    <li>
                        <c:url value='${renderContext.site.url}' var="settingsUrl"/>
                        <a href="${fn:replace(settingsUrl,'.html','.store-admin.html')}">
                            <i class="glyphicon glyphicon-cog"></i>
                            <fmt:message key="jnt_forgeModule.forgeSetting"/>
                        </a>
                    </li>
                </c:if>
                <li>
                    <c:url value='${renderContext.site.url}' var="settingsUrl"/>
                    <a href="${fn:replace(settingsUrl,'.html','.my-modules.html')}">
                        <i class="glyphicon glyphicon-cog"></i>
                        <fmt:message key="jnt_forgeModule.myModules"/>
                    </a>
                </li>
                <li role="separator" class="divider"></li>
                <li>
                    <a href="<c:url value='${url.logout}'/>">
                        <i class="glyphicon glyphicon-off"></i>
                        <fmt:message key="bootstrap3nt_navBarItemLoginForm.button.logout"/>
                    </a>
                </li>
            </ul>
        </li>
    </ul>
</c:if>