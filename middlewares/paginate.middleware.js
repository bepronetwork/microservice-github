function paginate(query = {}, {page = 0,} = {page: 0,}) {
  const limit = 10;
  const offset = (page - 1) * limit;
  return ({
    ...query,
    offset,
    limit,
  })
}

module.exports = paginate;
