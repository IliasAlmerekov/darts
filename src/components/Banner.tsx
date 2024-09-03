import React from "react";

function Banner(props: any) {
  return (
    <div className="banner">
      {props.name}
      {props.place}
    </div>
  );
}
export default Banner;
