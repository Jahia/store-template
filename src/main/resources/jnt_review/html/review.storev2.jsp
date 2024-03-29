<%@ taglib prefix="jcr" uri="http://www.jahia.org/tags/jcr" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="utility" uri="http://www.jahia.org/tags/utilityLib" %>
<%@ taglib prefix="template" uri="http://www.jahia.org/tags/templateLib" %>
<%@ taglib prefix="uiComponents" uri="http://www.jahia.org/tags/uiComponentsLib" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="query" uri="http://www.jahia.org/tags/queryLib" %>
<%@ taglib prefix="user" uri="http://www.jahia.org/tags/user" %>
<%--@elvariable id="currentNode" type="org.jahia.services.content.JCRNodeWrapper"--%>
<%--@elvariable id="out" type="java.io.PrintWriter"--%>
<%--@elvariable id="script" type="org.jahia.services.render.scripting.Script"--%>
<%--@elvariable id="scriptInfo" type="java.lang.String"--%>
<%--@elvariable id="workspace" type="java.lang.String"--%>
<%--@elvariable id="renderContext" type="org.jahia.services.render.RenderContext"--%>
<%--@elvariable id="currentResource" type="org.jahia.services.render.Resource"--%>
<%--@elvariable id="currentUser" type="org.jahia.services.usermanager.JahiaUser"--%>
<%--@elvariable id="url" type="org.jahia.services.render.URLGenerator"--%>

<template:addResources type="javascript" resources="html5shiv.js"/>
<template:addResources type="css" resources="ui.stars.css, ui.stars.review.css"/>
<template:addResources type="javascript" resources="forge.js"/>

<c:set var="id" value="${currentNode.identifier}"/>
<c:set var="createdBy" value="${currentNode.properties['jcr:createdBy'].string}"/>
<c:set var="rating" value="${currentNode.properties['rating'].long}"/>
<c:set var="title" value="${currentNode.properties['jcr:title'].string}"/>
<c:set var="content" value="${currentNode.properties['content'].string}"/>
<c:set var="created" value="${currentNode.properties['jcr:created'].date.time}"/>

<jcr:sql
        var="replies"
        sql="SELECT * FROM [jnt:post] WHERE isdescendantnode(['${currentNode.path}'])
              ORDER BY [jcr:created] ASC" />

<c:if test="${createdBy ne 'guest'}">
    <jcr:node var="user" path="${user:lookupUser(createdBy).localPath}"/>
    <jcr:nodeProperty node="${user}" name="j:publicProperties" var="publicProperties" />

    <c:forEach items="${publicProperties}" var="value">
        <c:set var="publicPropertiesAsString" value="${value.string} ${publicPropertiesAsString}"/>
    </c:forEach>

    <jcr:nodeProperty var="picture" node="${user}" name="j:picture"/>

    <c:if test="${fn:contains(publicPropertiesAsString,'j:firstName')}">
        <c:set var="firstName" value="${user.properties['j:firstName'].string}"/>
    </c:if>
    <c:if test="${fn:contains(publicPropertiesAsString,'j:lastName')}">
        <c:set var="lastName" value="${user.properties['j:lastName'].string}"/>
    </c:if>
</c:if>

<script type="text/javascript">

    $(document).ready(function(){

        <c:if test="${jcr:hasPermission(currentNode, 'jcr:write')}">

        $('#replyReviewToggle-${id}').click( function() {

            $(this).toggleClass('btn-inverse');
            $('#replyReview-${id}').slideToggle();
        });

        $("#replyReviewForm-${id}").validate({
            errorClass:'help-block',
            rules: {
                'content': {
                    required: true
                }
            },
            submitHandler: function(form) {
                reviewDoReply("<c:url value='${url.base}${currentNode.path}'/>", $(form), $(form).parents('.tab-pane').attr('id'));
            },
            highlight: function(element, errorClass, validClass) {
                $(element).addClass("error").removeClass(validClass).parents('.control-group').addClass("error");
            },
            unhighlight: function(element, errorClass, validClass) {
                $(element).removeClass("error").addClass(validClass).parents('.control-group').removeClass("error");
            }
        });

        </c:if>

    });

</script>
****************** In review View ...... ********************************
<div class="ac-review">
    <c:if test="${jcr:hasPermission(currentNode, 'jcr:write')}">

        <div class="pull-right">

            <c:set var="isForgeAdmin" value="${jcr:hasPermission(renderContext.site, 'jahiaForgeModerateModule')}"/>


            <c:choose>

                <c:when test="${isForgeAdmin}">
                    <%@include file="../../commons/adminButtons.jspf"%>
                </c:when>

                <c:otherwise>

                    <button id="replyReviewToggle-${id}" class="btn btn-small btn-primary"><fmt:message key="jnt_review.label.reply"/></button>

                    <%--- check if curent user is the owner of the module ---%>
                    <c:if test="${jcr:hasPermission(currentNode, 'jcr:write')}">
                        <%@include file="../../commons/reportButton.jspf"%>
                    </c:if>

                </c:otherwise>

            </c:choose>

        </div>

    </c:if>
    <c:if test="${not empty picture}">
        <img
                src="${picture.node.thumbnailUrls['avatar_60']}"
                <c:choose>
                    <c:when test="${not empty firstName || not empty lastName}">
                        alt="${fn:escapeXml(firstName)}<c:if test="${not empty firstName}">&nbsp;</c:if>${fn:escapeXml(lastName)}"
                    </c:when>
                    <c:otherwise>
                        alt="${createdBy}"
                    </c:otherwise>
                </c:choose>
                itemprop="image"/>
    </c:if>
    <c:if test="${empty picture}"><img alt="" src="<c:url value='/modules/default/images/userbig.png'/>"/></c:if>
    <div class="ac-com-right">
        <div class="com-name">${createdBy}</div>
        <span><time itemprop="datePublished" datetime="<fmt:formatDate value="${created}" pattern="yyyy-MM-dd" />">
                    <fmt:formatDate value="${created}" dateStyle="long" />
                </time></span>
        <div class="com-stars">
            <c:set var="worstRating" value="1"/>
            <c:set var="bestRating" value="5"/>
            <c:forEach var="i" begin="${worstRating}" end="${bestRating}">
                <c:choose>
                    <c:when test="${rating ge i}">
                        &#9733;
                    </c:when>
                    <c:otherwise>
                        &#9734;
                    </c:otherwise>
                </c:choose>
            </c:forEach>
        </div>
        <div class="com-title">${fn:escapeXml(title)}</div>
        <div class="ac-comtxt">${fn:escapeXml(content)}</div>
    </div>
</div>
<%--
<c:if test="${jcr:hasPermission(currentNode, 'jcr:write')}">
    <div id="replyReview-${id}" class="replyReview box box-rounded box-tinted box-margin-top">
        <template:tokenizedForm>
            <form id="replyReviewForm-${id}" class="replyReviewForm form-horizontal" action="<c:url value='${url.base}${currentNode.path}.replyReview.do'/>" method="post">
                <input type="hidden" name="jcrNodeType" value="jnt:review"/>

                <fieldset>

                    <div class="control-group">
                        <label class="control-label" for="reviewReply-${id}">
                            <fmt:message key="jnt_review.label.reply"/>
                        </label>
                        <div class="controls">
                            <textarea rows="7" id="reviewReply-${id}"
                                      name="content"
                            ><c:if test="${not empty sessionScope.formDatas['content']}">
                                ${fn:escapeXml(sessionScope.formDatas['content'][0])}
                            </c:if></textarea>
                        </div>
                    </div>

                    <div class="control-group">
                        <div class="controls">
                            <input class="btn btn-primary" type="submit" value="<fmt:message key='jnt_review.label.submitReply'/>"/>
                        </div>
                    </div>

                </fieldset>


            </form>

        </template:tokenizedForm>

    </div>

</c:if>

<c:forEach items="${replies.nodes}" var="reply">

    <template:module node="${reply}" view="reviewReply">
        <%--<template:param name="module.cache.additional.key" value="${reply.identifier}"/>
        <template:param name="cache.mainResource.flushParent" value="true"/>
        <template:param name="isForgeAdmin" value="${isForgeAdmin}"/>
        <template:param name="isReportedOverall" value="${isReportedOverall}"/>--%>
    <%--
        </template:module>

    </c:forEach>
    --%>


