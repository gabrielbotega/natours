class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    // 1A) Filtering
    const queryObj = { ...this.queryString }; // This method creates a hard copy of req.query. If I just make queryObj = req.query, I gonna reference the address, meaning that if I want to change something in the queryObj it'll affect my req.query (which I dont want)
    const excludedFields = ["page", "sort", "limit", "fields"];

    excludedFields.forEach((element) => delete queryObj[element]);

    //  console.log(req.query, queryObj); // query follows the "?" mark
    //object: {difficulty: "easy", duration: {$gte: 5}}//this operator, in the query, appears inside brakets [gte]

    // 1B) Advanced Filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`); //transforming { duration: { gte: '5' }, difficulty: 'easy' } to{"duration":{"$gte":"5"},"difficulty":"easy"}. transform to mongoDB style

    this.query = this.query.find(JSON.parse(queryStr)); // From the mongoDB query command. find method returns a query!!!
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      this.query = this.query.sort(this.queryString.sort.replaceAll(",", " "));
      //sort("price ratingsAverage") this will include a second parameter to sort
    } else {
      this.query = this.query.sort("name");
    }
    return this;
  }

  limitFields() {
    // 3) Fields limiting
    if (this.queryString.fields) {
      this.query = this.query.select(
        this.queryString.fields.replaceAll(",", " ")
      );
    } else {
      this.query = this.query.select("-__v");
    }

    return this;
  }

  paginate() {
    // 4) Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    // page 1 (1-10), 2 (11-20), 3 (21-30)...
    this.query = this.query.skip(skip).limit(limit); // skip X documents, limiting y per page.

    // if (req.query.page) {
    //   const numTour = await Tour.countDocuments();
    //   if (skip >= numTour) throw new Error("This page does not exist"); // goes directly to the catch
    // }
    return this;
  }
}

module.exports = APIFeatures;
