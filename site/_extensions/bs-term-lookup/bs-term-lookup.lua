local function metadata_boolean(value)
  if value == nil then
    return nil
  end

  if pandoc.utils.type(value) == "MetaBool" then
    return value
  end

  local text = pandoc.utils.stringify(value):lower()
  if text == "true" then
    return true
  end
  if text == "false" then
    return false
  end
  return nil
end

local function has_terms(value)
  if value == nil then
    return false
  end
  if pandoc.utils.type(value) == "List" then
    return #value > 0
  end
  return pandoc.utils.stringify(value) ~= ""
end

local function lookup_html()
  return table.concat({
    '<aside id="bs-term-lookup-panel" class="bs-term-lookup" data-bs-term-lookup hidden>',
    '  <div class="bs-term-lookup-heading">',
    '    <strong>Look up a term</strong>',
    '    <button type="button" class="bs-term-lookup-close" data-bs-term-lookup-close aria-controls="bs-term-lookup-panel" aria-expanded="true" aria-label="Collapse term lookup to the right"><span aria-hidden="true">&rarr;</span></button>',
    '  </div>',
    '  <form action="/glossary/" method="get" data-bs-term-lookup-form>',
    '    <label class="visually-hidden" for="bs-term-lookup-input">Term or alias</label>',
    '    <div class="bs-term-lookup-controls">',
    '      <input id="bs-term-lookup-input" name="q" type="search" required autocomplete="off" spellcheck="false" placeholder="Enter Term">',
    '      <button type="submit">Search</button>',
    '    </div>',
    '  </form>',
    '  <div class="bs-term-lookup-result" data-bs-term-lookup-result aria-live="polite" hidden></div>',
    '</aside>'
  }, "\n")
end

function Pandoc(doc)
  local enabled = metadata_boolean(doc.meta["term-lookup"])
  if enabled == nil then
    enabled = has_terms(doc.meta.terms)
  end

  if not enabled then
    return doc
  end

  table.insert(doc.blocks, 1, pandoc.RawBlock("html", lookup_html()))
  return doc
end
