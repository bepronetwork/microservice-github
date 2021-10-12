function paginate(query = {}, {page = 1, limit = 10} = {page: 1, limit: 10}) {
  const offset = page * limit;
  return ({
    ...query,
    offset,
    limit,
  })
}

module.exports = paginate;
