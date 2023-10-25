const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const APIFeatures = require("../utils/apiFeatures");

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id, {}); //commom practice not to send anything back

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true, //the new argument will be displayed
      runValidators: true, //every time we update, it'll check the validators (in model), confronting them.
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    let doc;

    if (Model.modelName === "Review") {
      doc = await Model.create({ ...req.body, user: req.user });
    } else {
      doc = await Model.create(req.body);
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (popOptions) query = query.populate(popOptions);

    const doc = await query; // params follows the "/" mark.Tours.findOne({_id: req.params.id}). (the populate() here will populate with the virtual schema)

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res) => {
    // Filtering to show all the tour review - this here allows for GET nested reviews on tour
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };
    //--------EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const doc = await features.query; //.explain();

    res.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    }); // (req, res) -> routing function.
  });
