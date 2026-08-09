#!/usr/bin/env Rscript

args <- commandArgs(trailingOnly = TRUE)
check_only <- "--check-only" %in% args
args <- args[args != "--check-only"]

if (length(args) != 2L) {
  stop(
    "Usage: install-r-dependencies.R [--check-only] <library> <requirements.R>",
    call. = FALSE
  )
}

library_path <- normalizePath(args[[1]], winslash = "/", mustWork = FALSE)
requirements_path <- normalizePath(args[[2]], winslash = "/", mustWork = TRUE)

if (!check_only) {
  dir.create(library_path, recursive = TRUE, showWarnings = FALSE)
}
if (!dir.exists(library_path)) {
  stop(
    sprintf("Repository R library is missing: %s", library_path),
    call. = FALSE
  )
}

requirements_environment <- new.env(parent = baseenv())
sys.source(requirements_path, envir = requirements_environment)
if (!exists("required_r_packages", envir = requirements_environment, inherits = FALSE)) {
  stop("requirements file must define required_r_packages", call. = FALSE)
}

required <- get("required_r_packages", envir = requirements_environment)
if (!is.character(required) || is.null(names(required)) || any(!nzchar(names(required)))) {
  stop("required_r_packages must be a named character vector of minimum versions", call. = FALSE)
}

installed_versions <- function() {
  local_packages <- installed.packages(lib.loc = library_path)
  base_packages <- installed.packages(lib.loc = .Library)
  versions <- c(
    stats::setNames(local_packages[, "Version"], rownames(local_packages)),
    stats::setNames(base_packages[, "Version"], rownames(base_packages))
  )
  versions[!duplicated(names(versions))]
}

installed <- installed_versions()
missing <- names(required)[!names(required) %in% names(installed)]
outdated <- names(required)[
  names(required) %in% names(installed) &
    vapply(
      names(required),
      function(package) {
        if (!package %in% names(installed)) return(FALSE)
        utils::compareVersion(installed[[package]], required[[package]]) < 0L
      },
      logical(1)
    )
]
needed <- unique(c(missing, outdated))

if (check_only && length(needed) > 0L) {
  details <- vapply(
    needed,
    function(package) sprintf("%s >= %s", package, required[[package]]),
    character(1)
  )
  stop(
    sprintf("Missing required R packages in .r-library: %s", paste(details, collapse = ", ")),
    call. = FALSE
  )
}

if (length(needed) > 0L) {
  options(repos = c(CRAN = "https://cloud.r-project.org"))
  install.packages(needed, lib = library_path, dependencies = NA)
  installed <- installed_versions()
}

unavailable <- names(required)[
  !names(required) %in% names(installed) |
    vapply(
      names(required),
      function(package) {
        if (!package %in% names(installed)) return(TRUE)
        utils::compareVersion(installed[[package]], required[[package]]) < 0L
      },
      logical(1)
    )
]
if (length(unavailable) > 0L) {
  stop(
    sprintf("R dependency installation did not satisfy: %s", paste(unavailable, collapse = ", ")),
    call. = FALSE
  )
}

versions <- vapply(
  names(required),
  function(package) installed[[package]],
  character(1)
)
cat(
  sprintf(
    "%s: %s\n",
    if (length(needed) > 0L) "R dependencies installed" else "R dependencies already satisfied",
    paste(sprintf("%s %s", names(versions), versions), collapse = ", ")
  )
)
