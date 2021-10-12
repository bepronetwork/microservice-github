function paginate(query = {}, {page = 1,} = {page: 1,}) {
  const limit = 10;
  const offset = page * limit;
  return ({
    ...query,
    offset,
    limit,
  })
}

module.exports = paginate;
