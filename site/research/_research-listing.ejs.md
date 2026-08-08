```{=html}
<%
const asList = (value) => {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

const formatReadingTime = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const text = String(value).trim();
  if (/\bread$/i.test(text)) return text;
  if (/\bmin$/i.test(text)) return `${text} read`;
  if (/^\d+$/.test(text)) return `${text} min read`;
  return text;
};
%>

<div class="bs-research-list list" data-bs-research-list>
<% for (const item of items) {
  const categories = asList(item.categories);
  const tags = asList(item.tags);
  const readingTime = formatReadingTime(item["reading-time"]);
%>
  <article
    class="bs-research-post"
    <%= metadataAttrs(item) %>
    data-bs-research-item
    data-bs-categories='<%- JSON.stringify(categories) %>'
    data-bs-tags='<%- JSON.stringify(tags) %>'>

    <div class="bs-research-post-header">
      <div>
        <h2 class="listing-title bs-research-post-title">
          <a href="<%- item.path %>"><%- item.title %></a>
        </h2>
        <% if (item.subtitle) { %>
          <p class="listing-subtitle bs-research-post-subtitle"><%- item.subtitle %></p>
        <% } %>
      </div>

      <% if (readingTime) { %>
        <p class="listing-reading-time bs-research-post-time"><%- readingTime %></p>
      <% } %>
    </div>

    <% if (item.description) { %>
      <p class="listing-description bs-research-post-description"><%- item.description %></p>
    <% } %>

    <% if (categories.length || tags.length) { %>
      <div class="bs-research-post-taxonomy">
        <% if (categories.length) { %>
          <div class="bs-research-post-taxonomy-group" aria-label="Article categories">
            <% for (const category of categories) { %>
              <button
                type="button"
                class="bs-research-card-taxonomy bs-research-card-taxonomy--category"
                data-bs-card-category="<%- category %>">
                <%- category %>
              </button>
            <% } %>
          </div>
        <% } %>

        <% if (tags.length) { %>
          <div class="bs-research-post-taxonomy-group" aria-label="Article tags">
            <% for (const tag of tags) { %>
              <button
                type="button"
                class="bs-research-card-taxonomy bs-research-card-taxonomy--tag"
                data-bs-card-tag="<%- tag %>">
                <%- tag %>
              </button>
            <% } %>
          </div>
        <% } %>
      </div>
    <% } %>

    <p class="bs-research-post-action">
      <a href="<%- item.path %>">Read article</a>
    </p>
  </article>
<% } %>
</div>
```